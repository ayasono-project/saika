import { MessageFlags, PermissionsBitField } from "discord.js";
import { createErrorEmbed } from "@/bot/utils/messageResponse";
import { TICKET_CHANNEL_BOT_PERMISSIONS } from "@/features/ticket/commands/ticketCommand.constants";

const findByChannelIdMock = vi.fn();
const findByGuildAndCategoryMock = vi.fn();
const reopenTicketMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketSettingsService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
  })),
  getBotTicketRepository: vi.fn(() => ({
    findByChannelId: findByChannelIdMock,
  })),
}));

vi.mock("@/features/ticket/services/ticketService", () => ({
  reopenTicket: (...args: unknown[]) => reopenTicketMock(...args),
}));

const getTicketChannelAccessMock = vi.fn();

// Bot がチャンネルを扱えるかの確認（既定は扱える）。案内のキーの選び方は本物を使う
vi.mock(
  "@/features/ticket/services/ticketChannelAccess",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/ticket/services/ticketChannelAccess")
    >()),
    getTicketChannelAccess: (...args: unknown[]) =>
      getTicketChannelAccessMock(...args),
  }),
);

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((msg: string) => ({
    type: "error",
    description: msg,
  })),
  createSuccessEmbed: vi.fn((msg: string) => ({
    type: "success",
    description: msg,
  })),
}));

/** スタッフロールを持たないメンバー（権限の確認で、作成者か管理者権限が無ければ止まる） */
const NON_STAFF_MEMBER = { roles: { cache: new Map([["role-other", {}]]) } };

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    guild: { id: "guild-1" },
    user: { id: "user-1" },
    // 既定の操作者はスタッフロールを持つ（権限の確認を通る）
    member: {
      roles: { cache: new Map([["staff-role-1", {}]]) },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTicketChannelAccessMock.mockResolvedValue({
      status: "handleable",
      channel: {},
    });
  });

  it("チケットが見つからない場合はエラー応答", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("既にオープン済みの場合はエラー応答", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("設定が無い（パネルが削除された）場合は、権限の有無ではなく操作できない旨を返信し、再オープンしない", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description: "ticket:user-response.ticket_config_missing",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("作成者でもスタッフでも管理者でもない場合は、誰が再オープンできるか（スタッフロールのメンション入り）を 権限不足 で返信し、Bot の権限も確かめず再オープンしない", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      userId: "other-user",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    const interaction = createInteractionMock({
      member: NON_STAFF_MEMBER,
      memberPermissions: new PermissionsBitField(["ManageMessages"]),
    });

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description:
            'ticket:user-response.not_authorized_close_open:{"staffRoles":"<@&staff-role-1>"}',
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
    expect(createErrorEmbed).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: "common:title_permission_denied" }),
    );
    expect(getTicketChannelAccessMock).not.toHaveBeenCalled();
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("管理者権限（Administrator）があれば、スタッフロールが無く作成者でなくても再オープンできる", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      userId: "other-user",
      status: "closed",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    reopenTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock({
      member: NON_STAFF_MEMBER,
      memberPermissions: new PermissionsBitField(["Administrator"]),
    });

    await handleTicketOpen(interaction as never);

    expect(reopenTicketMock).toHaveBeenCalledWith(
      ticket,
      interaction.guild,
      expect.anything(),
      expect.anything(),
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        { type: "success", description: "ticket:user-response.ticket_opened" },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("作成者なら、スタッフロールも管理者権限も無くても再オープンできる", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      userId: "user-1",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    reopenTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock({ member: NON_STAFF_MEMBER });

    await handleTicketOpen(interaction as never);

    expect(reopenTicketMock).toHaveBeenCalled();
  });

  it("正常に再オープンできた場合は reopenTicket が呼ばれ成功応答", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    reopenTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(reopenTicketMock).toHaveBeenCalledWith(
      ticket,
      interaction.guild,
      expect.anything(),
      expect.anything(),
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("Bot がチャンネルを扱えない（Bot を外して入れ直す前に作ったチケット）ときは、reopenTicket を呼ばずに理由と対処を返信する", async () => {
    const { handleTicketOpen } = await import(
      "@/features/ticket/commands/usecases/ticketOpen"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    getTicketChannelAccessMock.mockResolvedValue({
      status: "inaccessible",
      reason: "channel_permissions",
    });
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    // 再オープンはチャンネルを消さないので、「チャンネルの管理」は求めず4つの権限で確かめる
    expect(getTicketChannelAccessMock).toHaveBeenCalledWith(
      interaction.guild,
      "channel-1",
      TICKET_CHANNEL_BOT_PERMISSIONS,
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description: "ticket:user-response.bot_channel_access_missing",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });
});
