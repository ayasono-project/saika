// tests/unit/bot/features/ticket/commands/usecases/ticketDelete.test.ts

import { MessageFlags } from "discord.js";

const findByChannelIdMock = vi.fn();
const findByGuildAndCategoryMock = vi.fn();
const hasStaffRoleMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
  })),
  getBotTicketRepository: vi.fn(() => ({
    findByChannelId: findByChannelIdMock,
  })),
}));

vi.mock("@/bot/features/ticket/services/ticketService", () => ({
  hasStaffRole: (...args: unknown[]) => hasStaffRoleMock(...args),
}));

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
  tInteraction: (_locale: string, key: string) => key,
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

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    guild: { id: "guild-1" },
    user: { id: "user-1" },
    member: {
      roles: { cache: new Map([["role-1", {}]]) },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("チケットが見つからない場合はエラー応答", async () => {
    const { handleTicketDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("スタッフロールがない場合はエラー応答", async () => {
    const { handleTicketDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasStaffRoleMock.mockReturnValue(false);
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("スタッフロールがある場合は確認ダイアログが表示される", async () => {
    const { handleTicketDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasStaffRoleMock.mockReturnValue(true);
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
      "@/bot/features/ticket/commands/usecases/ticketDelete"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasStaffRoleMock.mockReturnValue(true);
    const interaction = createInteractionMock();

    await handleTicketDelete(interaction as never);

    const replyArgs = interaction.reply.mock.calls[0]?.[0];
    expect(replyArgs.components).toHaveLength(1);
    // ActionRow に2つのボタン（確認・キャンセル）が含まれる
    const actionRow = replyArgs.components[0];
    expect(actionRow.components).toHaveLength(2);
  });
});
