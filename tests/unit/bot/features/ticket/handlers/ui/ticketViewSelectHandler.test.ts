// tests/unit/bot/features/ticket/handlers/ui/ticketViewSelectHandler.test.ts

import { ticketViewSelectHandler } from "@/bot/features/ticket/handlers/ui/ticketViewSelectHandler";

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
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "warning",
    addFields: vi.fn().mockReturnThis(),
  })),
  createInfoEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "info",
    addFields: vi.fn().mockReturnThis(),
  })),
}));

const mockConfigService = {
  findByGuildAndCategory: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteAllByGuild: vi.fn(),
  incrementCounter: vi.fn(),
};
const mockTicketRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  findOpenByUserAndCategory: vi.fn(),
  findOpenByCategory: vi.fn(),
  findAllByCategory: vi.fn(),
  findAllClosedByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByCategory: vi.fn(),
  deleteAllByGuild: vi.fn(),
};
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: () => mockConfigService,
  getBotTicketRepository: () => mockTicketRepository,
}));

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ type: "ActionRow" })),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigView", () => ({
  buildConfigEmbed: vi.fn(() => ({ type: "embed" })),
}));

function createMockStringSelectInteraction(
  customId: string,
  values: string[] = [],
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn().mockResolvedValue({ name: "test-category" }) },
    },
    values,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketViewSelectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:view-select: プレフィックスにマッチする", () => {
      expect(ticketViewSelectHandler.matches("ticket:view-select:abc")).toBe(
        true,
      );
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(
        ticketViewSelectHandler.matches("ticket:teardown-select:abc"),
      ).toBe(false);
    });
  });

  describe("execute", () => {
    it("guildIdがnullの場合は早期リターンする", async () => {
      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-1"],
        { guildId: null, guild: null },
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
    });

    it("guildがnullの場合は早期リターンする", async () => {
      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-1"],
        { guild: null },
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
    });

    it("選択されたカテゴリが設定一覧に存在しない場合は早期リターンする", async () => {
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-nonexistent"],
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("正常系: 選択されたカテゴリのEmbed表示を更新する（複数設定）", async () => {
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-2"],
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });

    it("単一設定の場合はページネーションとセレクトメニューを表示しない", async () => {
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-1"],
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });

    it("チャンネル名取得に失敗した場合はcategoryIdをラベルに使用する", async () => {
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-1"],
        {
          guild: {
            id: "guild-1",
            channels: {
              fetch: vi.fn().mockRejectedValue(new Error("not found")),
            },
          },
        },
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalled();
    });

    it("チャンネルがnullの場合はcategoryIdをラベルに使用する", async () => {
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:view-select:",
        ["cat-1"],
        {
          guild: {
            id: "guild-1",
            channels: { fetch: vi.fn().mockResolvedValue(null) },
          },
        },
      );

      await ticketViewSelectHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalled();
    });
  });
});
