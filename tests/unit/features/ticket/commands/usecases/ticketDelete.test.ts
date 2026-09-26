import { MessageFlags, PermissionsBitField } from "discord.js";
import { createErrorEmbed } from "@/bot/utils/messageResponse";
import { TICKET_CHANNEL_BOT_DELETE_PERMISSIONS } from "@/features/ticket/commands/ticketCommand.constants";

const findByChannelIdMock = vi.fn();
const findByGuildAndCategoryMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketSettingsService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
  })),
  getBotTicketRepository: vi.fn(() => ({
    findByChannelId: findByChannelIdMock,
  })),
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
}));

/** スタッフロールを持たないメンバー（権限の確認で、管理者権限が無ければ止まる） */
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

describe("bot/features/ticket/commands/usecases/ticketDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTicketChannelAccessMock.mockResolvedValue({
      status: "handleable",
      channel: {},
    });
  });

  it("チケットが見つからない場合はエラー応答", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("設定が無い（パネルが削除された）場合は、権限不足ではなく操作できない旨を返信し、確認ダイアログを出さない", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
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

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description: "ticket:user-response.ticket_config_missing",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("スタッフロールも管理者権限も無い場合は、作成者でも、誰が削除できるか（スタッフロールのメンション入り）を 権限不足 で返信し、Bot の権限も確かめず確認ダイアログを出さない", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      userId: "user-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    const interaction = createInteractionMock({
      member: NON_STAFF_MEMBER,
      memberPermissions: new PermissionsBitField(["ManageMessages"]),
    });

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description:
            'ticket:user-response.not_authorized_delete:{"staffRoles":"<@&staff-role-1>"}',
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
    expect(createErrorEmbed).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: "common:title_permission_denied" }),
    );
    expect(getTicketChannelAccessMock).not.toHaveBeenCalled();
  });

  it("管理者権限（Administrator）があれば、スタッフロールが無くても確認ダイアログが表示される", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
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
      memberPermissions: new PermissionsBitField(["Administrator"]),
    });

    await handleTicketDelete(interaction as never);

    expect(getTicketChannelAccessMock).toHaveBeenCalledWith(
      interaction.guild,
      "channel-1",
      TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
    );
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          {
            type: "error",
            description: "ticket:embed.description.delete_warning",
          },
        ],
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("スタッフロールがある場合は確認ダイアログが表示される", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );
  });

  it("確認ダイアログに正しいボタンが含まれること", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    const replyArgs = interaction.reply.mock.calls[0]?.[0];
    expect(replyArgs.components).toHaveLength(1);
    // ActionRow に2つのボタン（確認・キャンセル）が含まれる
    const actionRow = replyArgs.components[0];
    expect(actionRow.components).toHaveLength(2);
  });

  it("Bot がチャンネルを扱えない（Bot を外して入れ直す前に作ったチケット）ときは、確認ダイアログを出さずに理由と対処を返信する", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    getTicketChannelAccessMock.mockResolvedValue({
      status: "inaccessible",
      reason: "channel_permissions",
    });
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
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

  it("「チャンネルの管理」を含む削除の権限で確かめ、それだけが無いときは、確認ダイアログを出さずにロールかチャンネルの権限設定を見直す案内を返信する", async () => {
    const { handleTicketDelete } = await import(
      "@/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: ["staff-role-1"],
    });
    getTicketChannelAccessMock.mockResolvedValue({
      status: "inaccessible",
      reason: "manage_channels",
    });
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(getTicketChannelAccessMock).toHaveBeenCalledWith(
      interaction.guild,
      "channel-1",
      TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
    );
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          type: "error",
          description: "ticket:user-response.bot_manage_channels_missing",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });
});
