// tests/unit/bot/features/ticket/handlers/ui/ticketCreateButtonHandler.test.ts

import { MessageFlags } from "discord.js";
import { ticketCreateButtonHandler } from "@/bot/features/ticket/handlers/ui/ticketCreateButtonHandler";

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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(),
  getBotTicketRepository: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn(() => ({ type: "warning" })),
  createInfoEmbed: vi.fn(() => ({ type: "info" })),
}));

import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "@/bot/services/botCompositionRoot";

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    user: { id: "user-1" },
    reply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketCreateButtonHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:create: で始まるcustomIdにマッチする", () => {
      expect(ticketCreateButtonHandler.matches("ticket:create:cat-1")).toBe(
        true,
      );
    });

    it("別のプレフィックスにはマッチしない", () => {
      expect(ticketCreateButtonHandler.matches("ticket:close:1")).toBe(false);
      expect(ticketCreateButtonHandler.matches("other:create:1")).toBe(false);
    });
  });

  describe("execute", () => {
    it("設定が見つからない場合はエラー応答を返す", async () => {
      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue(null),
      };
      const mockTicketRepository = {
        findOpenByUserAndCategory: vi.fn(),
      };
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );

      const interaction = createMockButtonInteraction("ticket:create:cat-1");

      await ticketCreateButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          flags: MessageFlags.Ephemeral,
        }),
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("同時チケット上限に達している場合はエラー応答", async () => {
      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          guildId: "guild-1",
          categoryId: "cat-1",
          maxTicketsPerUser: 1,
        }),
      };
      const mockTicketRepository = {
        findOpenByUserAndCategory: vi
          .fn()
          .mockResolvedValue([{ id: "ticket-1" }]),
      };
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );

      const interaction = createMockButtonInteraction("ticket:create:cat-1");

      await ticketCreateButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("上限未満の場合はモーダルが表示される", async () => {
      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          guildId: "guild-1",
          categoryId: "cat-1",
          maxTicketsPerUser: 3,
        }),
      };
      const mockTicketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );

      const interaction = createMockButtonInteraction("ticket:create:cat-1");

      await ticketCreateButtonHandler.execute(interaction as never);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("モーダルのcustomIdにカテゴリIDが含まれること", async () => {
      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          guildId: "guild-1",
          categoryId: "cat-1",
          maxTicketsPerUser: 3,
        }),
      };
      const mockTicketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );

      const interaction = createMockButtonInteraction("ticket:create:cat-1");

      await ticketCreateButtonHandler.execute(interaction as never);

      const modal = interaction.showModal.mock.calls[0]?.[0];
      expect(modal.data.custom_id).toContain("cat-1");
    });
  });
});
