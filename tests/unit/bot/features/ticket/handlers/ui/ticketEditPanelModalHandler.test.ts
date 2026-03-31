// tests/unit/bot/features/ticket/handlers/ui/ticketEditPanelModalHandler.test.ts

import { ticketEditPanelModalHandler } from "@/bot/features/ticket/handlers/ui/ticketEditPanelModalHandler";

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
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: () => mockConfigService,
  getBotTicketRepository: () => ({}),
}));

function createMockModalInteraction(
  customId: string,
  fields: Record<string, string> = {},
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: { id: "guild-1", channels: { fetch: vi.fn() } },
    channelId: "channel-1",
    channel: { send: vi.fn().mockResolvedValue({ id: "msg-1" }) },
    user: { id: "user-1" },
    fields: {
      getTextInputValue: vi.fn((fieldId: string) => fields[fieldId] ?? ""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketEditPanelModalHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:edit-panel-modal: プレフィックスにマッチする", () => {
      expect(
        ticketEditPanelModalHandler.matches("ticket:edit-panel-modal:cat-1"),
      ).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(
        ticketEditPanelModalHandler.matches("ticket:setup-modal:abc"),
      ).toBe(false);
    });
  });

  describe("execute", () => {
    it("guildIdがnullの場合は早期リターンする", async () => {
      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
        {},
        { guildId: null },
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(mockConfigService.findByGuildAndCategory).not.toHaveBeenCalled();
    });

    it("設定が見つからない場合はエラー応答する", async () => {
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);

      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(mockConfigService.update).not.toHaveBeenCalled();
    });

    it("正常系: DB設定を更新しパネルメッセージのEmbedを更新する", async () => {
      const mockPanelMessage = { edit: vi.fn().mockResolvedValue(undefined) };
      const mockPanelChannel = {
        messages: { fetch: vi.fn().mockResolvedValue(mockPanelMessage) },
      };
      const mockGuild = {
        id: "guild-1",
        channels: { fetch: vi.fn().mockResolvedValue(mockPanelChannel) },
      };

      mockConfigService.findByGuildAndCategory.mockResolvedValue({
        panelChannelId: "panel-ch-1",
        panelMessageId: "panel-msg-1",
        panelColor: "#00A8F3",
      });
      mockConfigService.update.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
        {
          "ticket:edit-panel-title": "New Title",
          "ticket:edit-panel-description": "New Description",
          "ticket:edit-panel-color": "#00A8F3",
        },
        { guild: mockGuild },
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(mockConfigService.update).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
        {
          panelTitle: "New Title",
          panelDescription: "New Description",
          panelColor: "#00A8F3",
        },
      );
      expect(mockPanelMessage.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });

    it("guildがnullの場合、パネル不在としてDB設定を削除しエラー応答する", async () => {
      mockConfigService.findByGuildAndCategory.mockResolvedValue({
        panelChannelId: "panel-ch-1",
        panelMessageId: "panel-msg-1",
        panelColor: "#00A8F3",
      });
      mockConfigService.update.mockResolvedValue(undefined);
      mockConfigService.delete.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
        {},
        { guild: null },
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.objectContaining({ type: "error" })],
        }),
      );
    });

    it("パネルチャンネルが見つからない場合はDB設定を削除しエラー応答する", async () => {
      const mockGuild = {
        id: "guild-1",
        channels: { fetch: vi.fn().mockResolvedValue(null) },
      };

      mockConfigService.findByGuildAndCategory.mockResolvedValue({
        panelChannelId: "panel-ch-1",
        panelMessageId: "panel-msg-1",
        panelColor: "#00A8F3",
      });
      mockConfigService.delete.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
        {},
        { guild: mockGuild },
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
      expect(mockConfigService.update).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.objectContaining({ type: "error" })],
        }),
      );
    });

    it("パネルメッセージが見つからない場合はDB設定を削除しエラー応答する", async () => {
      const mockPanelChannel = {
        messages: { fetch: vi.fn().mockResolvedValue(null) },
      };
      const mockGuild = {
        id: "guild-1",
        channels: { fetch: vi.fn().mockResolvedValue(mockPanelChannel) },
      };

      mockConfigService.findByGuildAndCategory.mockResolvedValue({
        panelChannelId: "panel-ch-1",
        panelMessageId: "panel-msg-1",
        panelColor: "#00A8F3",
      });
      mockConfigService.delete.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:edit-panel-modal:cat-1",
        {},
        { guild: mockGuild },
      );

      await ticketEditPanelModalHandler.execute(interaction as never);

      expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
      expect(mockConfigService.update).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.objectContaining({ type: "error" })],
        }),
      );
    });
  });
});
