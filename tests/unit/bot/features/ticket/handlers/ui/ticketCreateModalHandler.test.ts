// tests/unit/bot/features/ticket/handlers/ui/ticketCreateModalHandler.test.ts

import { ticketCreateModalHandler } from "@/bot/features/ticket/handlers/ui/ticketCreateModalHandler";

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

vi.mock("@/bot/features/ticket/services/ticketService", () => ({
  createTicketChannel: vi.fn(),
  closeTicket: vi.fn(),
  reopenTicket: vi.fn(),
  deleteTicket: vi.fn(),
  hasTicketPermission: vi.fn(),
  hasStaffRole: vi.fn(),
}));

import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { createTicketChannel } from "@/bot/features/ticket/services/ticketService";

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
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketCreateModalHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:create-modal: プレフィックスにマッチする", () => {
      expect(
        ticketCreateModalHandler.matches("ticket:create-modal:cat-1"),
      ).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketCreateModalHandler.matches("ticket:setup-modal:abc")).toBe(
        false,
      );
      expect(ticketCreateModalHandler.matches("other:create-modal:abc")).toBe(
        false,
      );
    });
  });

  describe("execute", () => {
    it("guildがnullの場合は早期リターンする", async () => {
      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {},
        { guild: null },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(createTicketChannel).not.toHaveBeenCalled();
      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it("正常系: チケットチャンネルを作成し成功応答する", async () => {
      const mockChannel = { id: "new-channel-1" };
      vi.mocked(createTicketChannel).mockResolvedValue({
        channel: mockChannel,
      } as never);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(createTicketChannel).toHaveBeenCalledWith(
        interaction.guild,
        "cat-1",
        "user-1",
        "Test Subject",
        "Test Detail",
        mockConfigService,
        mockTicketRepository,
      );
      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });

    it("MissingPermissionsエラー時は上位ハンドラへ伝播する", async () => {
      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/guilds/guild-1/channels",
        {},
      );
      vi.mocked(createTicketChannel).mockRejectedValue(apiError);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await expect(
        ticketCreateModalHandler.execute(interaction as never),
      ).rejects.toThrow(apiError);
    });

    it("その他のエラーも上位ハンドラへ伝播する", async () => {
      const otherError = new Error("Unknown error");
      vi.mocked(createTicketChannel).mockRejectedValue(otherError);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await expect(
        ticketCreateModalHandler.execute(interaction as never),
      ).rejects.toThrow("Unknown error");
    });
  });
});
