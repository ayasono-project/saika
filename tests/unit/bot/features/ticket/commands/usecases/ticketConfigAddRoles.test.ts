// tests/unit/bot/features/ticket/commands/usecases/ticketConfigAddRoles.test.ts

import { MessageFlags } from "discord.js";

const findByGuildAndCategoryMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
  })),
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
  createSuccessEmbed: vi.fn((msg: string) => ({
    type: "success",
    description: msg,
  })),
}));

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    guild: { id: "guild-1" },
    options: {
      getChannel: vi.fn(() => ({ id: "category-1" })),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketConfigAddRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が見つからない場合はエラー応答を返す", async () => {
    const { handleTicketConfigAddRoles } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigAddRoles"
    );

    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketConfigAddRoles(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
      }),
    );
  });

  it("設定が見つからない場合は正しいカテゴリIDでサービスを呼び出す", async () => {
    const { handleTicketConfigAddRoles } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigAddRoles"
    );

    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketConfigAddRoles(interaction as never, "guild-1");

    expect(findByGuildAndCategoryMock).toHaveBeenCalledWith(
      "guild-1",
      "category-1",
    );
  });

  it("設定が存在する場合はロール選択メニューを返す", async () => {
    const { handleTicketConfigAddRoles } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigAddRoles"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      staffRoleIds: "[]",
    });
    const interaction = createInteractionMock();

    await handleTicketConfigAddRoles(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("ロール選択メニューのcustomIdにADD_ROLES_PREFIXとカテゴリIDが含まれる", async () => {
    const { handleTicketConfigAddRoles } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigAddRoles"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      staffRoleIds: "[]",
    });
    const interaction = createInteractionMock();

    await handleTicketConfigAddRoles(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const component = replyCall.components[0];
    const menuData = component.components[0].data;
    expect(menuData.custom_id).toBe("ticket:add-roles:category-1");
  });
});
