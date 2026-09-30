import { ticketTeardownSelectHandler } from "@/features/ticket/handlers/ui/ticketTeardownSelectHandler";

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "warning",
    addFields: vi.fn().mockReturnThis(),
  })),
}));

const mockTicketRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  findOpenByUserAndCategory: vi.fn(),
  findOpenByCategory: vi.fn(),
  findAllClosedByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByCategory: vi.fn(),
};
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketRepository: () => mockTicketRepository,
}));

vi.mock("@/features/ticket/handlers/ui/ticketTeardownState", () => ({
  ticketTeardownSessions: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ticketTeardownSessions } from "@/features/ticket/handlers/ui/ticketTeardownState";

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
      channels: {
        fetch: vi.fn().mockResolvedValue({ name: "test-category" }),
      },
    },
    values,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketTeardownSelectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:teardown-select: プレフィックスにマッチする", () => {
      expect(
        ticketTeardownSelectHandler.matches("ticket:teardown-select:abc"),
      ).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(
        ticketTeardownSelectHandler.matches("ticket:view-select:abc"),
      ).toBe(false);
    });
  });

  describe("execute", () => {
    it("guildIdがnullの場合は早期リターンする", async () => {
      const interaction = createMockStringSelectInteraction(
        "ticket:teardown-select:abc",
        ["cat-1"],
        { guildId: null },
      );

      await ticketTeardownSelectHandler.execute(interaction as never);

      expect(ticketTeardownSessions.set).not.toHaveBeenCalled();
      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("選択されたカテゴリIDをセッションに保存し確認ダイアログを表示する", async () => {
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:teardown-select:abc",
        ["cat-1"],
      );

      await ticketTeardownSelectHandler.execute(interaction as never);

      expect(ticketTeardownSessions.set).toHaveBeenCalledWith("abc", {
        categoryIds: ["cat-1"],
      });
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });

    it("複数カテゴリを選択した場合にすべてのカテゴリIDがセッションに保存される", async () => {
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockStringSelectInteraction(
        "ticket:teardown-select:abc",
        ["cat-1", "cat-2", "cat-3"],
      );

      await ticketTeardownSelectHandler.execute(interaction as never);

      expect(ticketTeardownSessions.set).toHaveBeenCalledWith("abc", {
        categoryIds: ["cat-1", "cat-2", "cat-3"],
      });
      expect(interaction.update).toHaveBeenCalled();
    });

    it("オープンチケットがある場合は警告Embedにチケット一覧を表示する", async () => {
      const tickets = [
        { id: "t-1", channelId: "ch-1" },
        { id: "t-2", channelId: "ch-2" },
      ];
      mockTicketRepository.findOpenByCategory.mockResolvedValue(tickets);

      const interaction = createMockStringSelectInteraction(
        "ticket:teardown-select:abc",
        ["cat-1"],
      );

      await ticketTeardownSelectHandler.execute(interaction as never);

      const { createWarningEmbed } = await import(
        "@/bot/utils/messageResponse"
      );
      expect(createWarningEmbed).toHaveBeenCalled();
      expect(ticketTeardownSessions.set).toHaveBeenCalled();
      expect(interaction.update).toHaveBeenCalled();
    });

    it("オープンチケットが最大表示件数を超える場合は省略表示する", async () => {
      // TICKET_LIST_MAX_DISPLAY = 10 なので11件作る
      const tickets = Array.from({ length: 11 }, (_, i) => ({
        id: `t-${i}`,
        channelId: `ch-${i}`,
      }));
      mockTicketRepository.findOpenByCategory.mockResolvedValue(tickets);

      const interaction = createMockStringSelectInteraction(
        "ticket:teardown-select:abc",
        ["cat-1"],
      );

      await ticketTeardownSelectHandler.execute(interaction as never);

      expect(ticketTeardownSessions.set).toHaveBeenCalled();
      expect(interaction.update).toHaveBeenCalled();
    });
  });
});
