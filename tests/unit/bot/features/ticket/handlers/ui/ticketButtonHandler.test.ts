// tests/unit/bot/features/ticket/handlers/ui/ticketButtonHandler.test.ts

import { ticketButtonHandler } from "@/bot/features/ticket/handlers/ui/ticketButtonHandler";

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

vi.mock("@/bot/features/ticket/services/ticketService", () => ({
  closeTicket: vi.fn(),
  reopenTicket: vi.fn(),
  deleteTicket: vi.fn(),
  hasTicketPermission: vi.fn(),
  hasStaffRole: vi.fn(),
}));

import {
  closeTicket,
  deleteTicket,
  hasStaffRole,
  hasTicketPermission,
  reopenTicket,
} from "@/bot/features/ticket/services/ticketService";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "@/bot/services/botCompositionRoot";

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
    member: { roles: { cache: new Map([["role-1", {}]]) } },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketButtonHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:close: プレフィックスにマッチ", () => {
      expect(ticketButtonHandler.matches("ticket:close:1")).toBe(true);
    });

    it("ticket:open: プレフィックスにマッチ", () => {
      expect(ticketButtonHandler.matches("ticket:open:1")).toBe(true);
    });

    it("ticket:delete: プレフィックスにマッチ", () => {
      expect(ticketButtonHandler.matches("ticket:delete:1")).toBe(true);
    });

    it("ticket:delete-confirm: プレフィックスにマッチ", () => {
      expect(ticketButtonHandler.matches("ticket:delete-confirm:1")).toBe(true);
    });

    it("ticket:delete-cancel: プレフィックスにマッチ", () => {
      expect(ticketButtonHandler.matches("ticket:delete-cancel:1")).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketButtonHandler.matches("other:action:1")).toBe(false);
      expect(ticketButtonHandler.matches("ticket:create:1")).toBe(false);
    });
  });

  describe("execute (close action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepository = {
        findById: vi.fn().mockResolvedValue(null),
      };
      const mockConfigService = {
        findByGuildAndCategory: vi.fn(),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );

      const interaction = createMockButtonInteraction("ticket:close:ticket-1");

      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });

    it("チケットクローズが正常に動作する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepository = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          staffRoleIds: '["role-1"]',
        }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(closeTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1");

      await ticketButtonHandler.execute(interaction as never);

      expect(closeTicket).toHaveBeenCalledWith(
        mockTicket,
        interaction.guild,
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
  });

  describe("execute (close action) - additional branches", () => {
    it("チケットが既にクローズ済みの場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction("ticket:close:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
      expect(closeTicket).not.toHaveBeenCalled();
    });

    it("権限がない場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "other-user",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["staff-role"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(false as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
      expect(closeTicket).not.toHaveBeenCalled();
    });

    it("guildがnullの場合は早期リターンする", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1", {
        guild: null,
      });
      await ticketButtonHandler.execute(interaction as never);

      expect(closeTicket).not.toHaveBeenCalled();
    });

    it("configがnullの場合はstaffRoleIdsが空配列になる", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(closeTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(hasTicketPermission).toHaveBeenCalledWith(
        mockTicket,
        "user-1",
        expect.any(Array),
        [],
      );
    });
  });

  describe("execute (open action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepo = { findById: vi.fn().mockResolvedValue(null) };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction("ticket:open:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("チケットが既にオープンの場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction("ticket:open:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
      expect(reopenTicket).not.toHaveBeenCalled();
    });

    it("権限がない場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "other-user",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["staff-role"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(false as never);

      const interaction = createMockButtonInteraction("ticket:open:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
      expect(reopenTicket).not.toHaveBeenCalled();
    });

    it("guildがnullの場合は早期リターンする", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);

      const interaction = createMockButtonInteraction("ticket:open:ticket-1", {
        guild: null,
      });
      await ticketButtonHandler.execute(interaction as never);

      expect(reopenTicket).not.toHaveBeenCalled();
    });

    it("正常系: チケットを再オープンする", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(reopenTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:open:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(reopenTicket).toHaveBeenCalledWith(
        mockTicket,
        interaction.guild,
        mockConfigSvc,
        mockTicketRepo,
      );
      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("configがnullの場合はstaffRoleIdsが空配列になる", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(reopenTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:open:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(hasTicketPermission).toHaveBeenCalledWith(
        mockTicket,
        "user-1",
        expect.any(Array),
        [],
      );
    });
  });

  describe("execute (delete action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepo = { findById: vi.fn().mockResolvedValue(null) };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction("ticket:delete:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("スタッフロールがない場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["staff-role"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(false as never);

      const interaction = createMockButtonInteraction("ticket:delete:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("正常系: 削除確認ダイアログを表示する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(true as never);

      const interaction = createMockButtonInteraction("ticket:delete:ticket-1");
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });
  });

  describe("execute (delete-confirm action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepo = { findById: vi.fn().mockResolvedValue(null) };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
      );
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("スタッフロールがない場合はエラー応答する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["staff-role"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(false as never);

      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
      );
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
      expect(deleteTicket).not.toHaveBeenCalled();
    });

    it("正常系: チケットを削除する", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(true as never);
      vi.mocked(deleteTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
      );
      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalled();
      expect(deleteTicket).toHaveBeenCalledWith(
        mockTicket,
        interaction.guild,
        mockTicketRepo,
      );
    });

    it("guildがnullの場合はdeleteTicketを呼ばない", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(true as never);

      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
        {
          guild: null,
        },
      );
      await ticketButtonHandler.execute(interaction as never);

      expect(deleteTicket).not.toHaveBeenCalled();
    });

    it("reply失敗時でもdeleteTicketは呼ばれる", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "closed",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: '["role-1"]' }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasStaffRole).mockReturnValue(true as never);
      vi.mocked(deleteTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
        {
          reply: vi.fn().mockRejectedValue(new Error("reply failed")),
        },
      );
      await ticketButtonHandler.execute(interaction as never);

      expect(deleteTicket).toHaveBeenCalled();
    });
  });

  describe("execute (delete-cancel action)", () => {
    it("キャンセル時にメッセージが更新される", async () => {
      const interaction = createMockButtonInteraction(
        "ticket:delete-cancel:ticket-1",
      );

      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });
  });

  describe("getMemberRoleIds", () => {
    it("memberにrolesのcacheがない場合は空配列を返す", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: "[]" }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(closeTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1", {
        member: { roles: {} },
      });
      await ticketButtonHandler.execute(interaction as never);

      expect(hasTicketPermission).toHaveBeenCalledWith(
        mockTicket,
        "user-1",
        [],
        [],
      );
    });

    it("memberがnullの場合は空配列を返す", async () => {
      const mockTicket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId: "user-1",
        status: "open",
      };
      const mockTicketRepo = {
        findById: vi.fn().mockResolvedValue(mockTicket),
      };
      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: "[]" }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );
      vi.mocked(hasTicketPermission).mockReturnValue(true as never);
      vi.mocked(closeTicket).mockResolvedValue(undefined as never);

      const interaction = createMockButtonInteraction("ticket:close:ticket-1", {
        member: null,
      });
      await ticketButtonHandler.execute(interaction as never);

      expect(hasTicketPermission).toHaveBeenCalledWith(
        mockTicket,
        "user-1",
        [],
        [],
      );
    });
  });
});
