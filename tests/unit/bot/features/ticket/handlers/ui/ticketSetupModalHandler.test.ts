// tests/unit/bot/features/ticket/handlers/ui/ticketSetupModalHandler.test.ts

import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { ticketSetupModalHandler } from "@/bot/features/ticket/handlers/ui/ticketSetupModalHandler";

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

vi.mock("@/bot/features/ticket/handlers/ui/ticketSetupState", () => ({
  ticketSetupSessions: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ticketSetupSessions } from "@/bot/features/ticket/handlers/ui/ticketSetupState";

function createMockModalInteraction(
  customId: string,
  fields: Record<string, string> = {},
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn() },
      members: { me: { id: "bot-1" } },
    },
    channelId: "channel-1",
    channel: {
      send: vi.fn().mockResolvedValue({ id: "msg-1", channelId: "channel-1" }),
    },
    user: { id: "user-1" },
    fields: {
      getTextInputValue: vi.fn((fieldId: string) => fields[fieldId] ?? ""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    message: { delete: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketSetupModalHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:setup-modal: プレフィックスにマッチする", () => {
      expect(ticketSetupModalHandler.matches("ticket:setup-modal:abc")).toBe(
        true,
      );
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketSetupModalHandler.matches("ticket:create-modal:abc")).toBe(
        false,
      );
      expect(ticketSetupModalHandler.matches("other:setup-modal:abc")).toBe(
        false,
      );
    });
  });

  describe("execute", () => {
    it("セッションが見つからない場合はエラー応答する", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
      );

      await ticketSetupModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(mockConfigService.create).not.toHaveBeenCalled();
    });

    it("guildIdがnullの場合は早期リターンする", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      });

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
        {},
        {
          guildId: null,
        },
      );

      await ticketSetupModalHandler.execute(interaction as never);

      expect(mockConfigService.create).not.toHaveBeenCalled();
    });

    it("既にカテゴリに設定が存在する場合はエラー応答する", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      });
      mockConfigService.findByGuildAndCategory.mockResolvedValue({
        id: "config-1",
      });

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
      );

      await ticketSetupModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(ticketSetupSessions.delete).toHaveBeenCalledWith("session-1");
      expect(mockConfigService.create).not.toHaveBeenCalled();
    });

    it("channelがnullの場合は早期リターンする", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      });
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
        {
          "ticket:setup-title": "Title",
          "ticket:setup-description": "Desc",
        },
        { channel: null },
      );

      await ticketSetupModalHandler.execute(interaction as never);

      expect(mockConfigService.create).not.toHaveBeenCalled();
    });

    it("正常系: パネルメッセージを送信しDB設定を保存する", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1", "role-2"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      } as never);
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);
      mockConfigService.create.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
        {
          "ticket:setup-title": "Test Title",
          "ticket:setup-description": "Test Description",
        },
      );

      await ticketSetupModalHandler.execute(interaction as never);

      expect(interaction.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
      expect(mockConfigService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: "guild-1",
          categoryId: "cat-1",
          enabled: true,
          staffRoleIds: JSON.stringify(["role-1", "role-2"]),
          panelChannelId: "channel-1",
          panelMessageId: "msg-1",
          autoDeleteDays: 7,
          maxTicketsPerUser: 1,
          ticketCounter: 0,
        }),
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      expect(ticketSetupSessions.delete).toHaveBeenCalledWith("session-1");
      // ロール選択メニューのメッセージが削除されること（commandInteraction.deleteReply経由）
    });

    it("channel.send で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      });
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);

      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/channels/channel-1/messages",
        {},
      );
      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
        {
          "ticket:setup-title": "Title",
          "ticket:setup-description": "Desc",
        },
      );
      interaction.channel.send = vi.fn().mockRejectedValue(apiError);

      await expect(
        ticketSetupModalHandler.execute(interaction as never),
      ).rejects.toBe(apiError);
    });

    it("messageがnullの場合でもエラーにならない", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue({
        categoryId: "cat-1",
        staffRoleIds: ["role-1"],
        commandInteraction: {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        } as never,
      });
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);
      mockConfigService.create.mockResolvedValue(undefined);

      const interaction = createMockModalInteraction(
        "ticket:setup-modal:session-1",
        {
          "ticket:setup-title": "Title",
          "ticket:setup-description": "Desc",
        },
        { message: null },
      );

      await expect(
        ticketSetupModalHandler.execute(interaction as never),
      ).resolves.toBeUndefined();
      expect(mockConfigService.create).toHaveBeenCalled();
    });
  });
});
