// tests/unit/bot/features/ticket/handlers/ui/ticketTeardownButtonHandler.test.ts

import { ticketTeardownButtonHandler } from "@/bot/features/ticket/handlers/ui/ticketTeardownButtonHandler";

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

vi.mock("@/bot/features/ticket/services/ticketCleanupService", () => ({
  cleanupTicketConfigs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/bot/features/ticket/handlers/ui/ticketTeardownState", () => ({
  ticketTeardownSessions: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ticketTeardownSessions } from "@/bot/features/ticket/handlers/ui/ticketTeardownState";
import { cleanupTicketConfigs } from "@/bot/features/ticket/services/ticketCleanupService";

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn() },
    },
    user: { id: "user-1" },
    member: { roles: { cache: new Map([["staff-role-1", {}]]) } },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketTeardownButtonHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:teardown-confirm: プレフィックスにマッチする", () => {
      expect(
        ticketTeardownButtonHandler.matches("ticket:teardown-confirm:abc"),
      ).toBe(true);
    });

    it("ticket:teardown-cancel: プレフィックスにマッチする", () => {
      expect(
        ticketTeardownButtonHandler.matches("ticket:teardown-cancel:abc"),
      ).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketTeardownButtonHandler.matches("ticket:close:abc")).toBe(
        false,
      );
    });
  });

  describe("execute (cancel)", () => {
    it("キャンセル時にセッションを削除しメッセージを更新する", async () => {
      const interaction = createMockButtonInteraction(
        "ticket:teardown-cancel:session-1",
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(ticketTeardownSessions.delete).toHaveBeenCalledWith("session-1");
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });
  });

  describe("execute (confirm)", () => {
    it("セッションが見つからない場合はエラー応答する", async () => {
      vi.mocked(ticketTeardownSessions.get).mockReturnValue(undefined);

      const interaction = createMockButtonInteraction(
        "ticket:teardown-confirm:session-1",
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });

    it("guildIdがnullの場合は早期リターンする", async () => {
      vi.mocked(ticketTeardownSessions.get).mockReturnValue({
        categoryIds: ["cat-1"],
      });

      const interaction = createMockButtonInteraction(
        "ticket:teardown-confirm:session-1",
        {
          guildId: null,
          guild: null,
        },
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(mockConfigService.findByGuildAndCategory).not.toHaveBeenCalled();
    });

    it("guildがnullの場合は早期リターンする", async () => {
      vi.mocked(ticketTeardownSessions.get).mockReturnValue({
        categoryIds: ["cat-1"],
      });

      const interaction = createMockButtonInteraction(
        "ticket:teardown-confirm:session-1",
        {
          guild: null,
        },
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(mockConfigService.findByGuildAndCategory).not.toHaveBeenCalled();
    });

    it("設定が見つからない場合はエラー応答する", async () => {
      vi.mocked(ticketTeardownSessions.get).mockReturnValue({
        categoryIds: ["cat-1"],
      });
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);

      const interaction = createMockButtonInteraction(
        "ticket:teardown-confirm:session-1",
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });

    it("正常系: cleanupTicketConfigsを呼び出しセッション削除を行う", async () => {
      vi.mocked(ticketTeardownSessions.get).mockReturnValue({
        categoryIds: ["cat-1"],
      });

      const mockConfig = {
        categoryIds: ["cat-1"],
        panelChannelId: "panel-ch-1",
        panelMessageId: "panel-msg-1",
      };
      mockConfigService.findByGuildAndCategory.mockResolvedValue(mockConfig);

      const mockGuild = {
        id: "guild-1",
        channels: { fetch: vi.fn() },
      };

      const interaction = createMockButtonInteraction(
        "ticket:teardown-confirm:session-1",
        {
          guild: mockGuild,
        },
      );

      await ticketTeardownButtonHandler.execute(interaction as never);

      expect(cleanupTicketConfigs).toHaveBeenCalledWith(
        mockGuild,
        [mockConfig],
        mockConfigService,
        mockTicketRepository,
      );
      expect(ticketTeardownSessions.delete).toHaveBeenCalledWith("session-1");
      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });
  });
});
