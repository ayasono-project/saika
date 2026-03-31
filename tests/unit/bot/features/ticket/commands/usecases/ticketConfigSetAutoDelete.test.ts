// tests/unit/bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete.test.ts

import { MessageFlags } from "discord.js";

const findByGuildAndCategoryMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
    update: updateMock,
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
      getInteger: vi.fn(() => 7),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が見つからない場合はエラー応答", async () => {
    const { handleTicketConfigSetAutoDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete"
    );

    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketConfigSetAutoDelete(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("正常に更新できた場合は成功応答", async () => {
    const { handleTicketConfigSetAutoDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      autoDeleteDays: 3,
    });
    updateMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock();

    await handleTicketConfigSetAutoDelete(interaction as never, "guild-1");

    expect(updateMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("days パラメータが正しく渡されること", async () => {
    const { handleTicketConfigSetAutoDelete } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      autoDeleteDays: 3,
    });
    updateMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock({
      options: {
        getChannel: vi.fn(() => ({ id: "category-1" })),
        getInteger: vi.fn(() => 14),
      },
    });

    await handleTicketConfigSetAutoDelete(interaction as never, "guild-1");

    expect(updateMock).toHaveBeenCalledWith("guild-1", "category-1", {
      autoDeleteDays: 14,
    });
  });
});
