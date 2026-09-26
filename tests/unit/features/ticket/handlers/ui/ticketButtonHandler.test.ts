import { ticketButtonHandler } from "@/features/ticket/handlers/ui/ticketButtonHandler";

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
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
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
  getBotTicketSettingsService: vi.fn(),
  getBotTicketRepository: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn(() => ({ type: "warning" })),
  createInfoEmbed: vi.fn(() => ({ type: "info" })),
}));

vi.mock("@/features/ticket/services/ticketService", () => ({
  closeTicket: vi.fn(),
  reopenTicket: vi.fn(),
  deleteTicket: vi.fn(),
}));

// Bot がチャンネルを扱えるかの確認（既定は beforeEach で「扱える」にする）。案内のキーの選び方は本物を使う
vi.mock(
  "@/features/ticket/services/ticketChannelAccess",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/ticket/services/ticketChannelAccess")
    >()),
    getTicketChannelAccess: vi.fn(),
  }),
);

import { MessageFlags, PermissionsBitField } from "discord.js";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "@/bot/services/botCompositionRoot";
import { createErrorEmbed } from "@/bot/utils/messageResponse";
import {
  TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  TICKET_CHANNEL_BOT_PERMISSIONS,
} from "@/features/ticket/commands/ticketCommand.constants";
import { getTicketChannelAccess } from "@/features/ticket/services/ticketChannelAccess";
import {
  closeTicket,
  deleteTicket,
  reopenTicket,
} from "@/features/ticket/services/ticketService";
import { logger } from "@/shared/utils/logger";

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
  // 各テストでモックの呼び出し記録を初期化し、Bot はチャンネルを扱える状態から始める
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTicketChannelAccess).mockResolvedValue({
      status: "handleable",
      channel: {} as never,
    });
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
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
          staffRoleIds: ["role-1"],
        }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepository as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigService as never,
      );
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
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
          .mockResolvedValue({ staffRoleIds: ["staff-role"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

      const interaction = createMockButtonInteraction("ticket:close:ticket-1", {
        guild: null,
      });
      await ticketButtonHandler.execute(interaction as never);

      expect(closeTicket).not.toHaveBeenCalled();
    });
  });

  describe("execute (open action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepo = { findById: vi.fn().mockResolvedValue(null) };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
          .mockResolvedValue({ staffRoleIds: ["staff-role"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );
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
  });

  describe("execute (delete action)", () => {
    it("チケットが見つからない場合はエラー応答する", async () => {
      const mockTicketRepo = { findById: vi.fn().mockResolvedValue(null) };
      const mockConfigSvc = { findByGuildAndCategory: vi.fn() };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
          .mockResolvedValue({ staffRoleIds: ["staff-role"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
          .mockResolvedValue({ staffRoleIds: ["staff-role"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );
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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

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
          .mockResolvedValue({ staffRoleIds: ["role-1"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );
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

  // 操作者の権限（管理者権限・スタッフロール・作成者）ごとに、操作できるか・何を返すかを検証
  describe("操作者の権限", () => {
    /**
     * 作成者が別のメンバー（other-user）で、スタッフロールが staff-role のチケットを返すようにする
     * @param status チケットの状態
     * @param userId チケットの作成者
     * @returns 返すチケット・リポジトリ・設定サービス
     */
    function setUpTicket(status: string, userId = "other-user") {
      const ticket = {
        id: "ticket-1",
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "channel-1",
        userId,
        status,
      };
      const ticketRepository = {
        findById: vi.fn().mockResolvedValue(ticket),
      };
      const settingsService = {
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ staffRoleIds: ["staff-role"] }),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        ticketRepository as never,
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        settingsService as never,
      );
      return { ticket, ticketRepository, settingsService };
    }

    it.each([
      { action: "close", status: "open" },
      { action: "open", status: "closed" },
    ])(
      "$action: 管理者権限（Administrator）があれば、スタッフロールが無く作成者でなくても操作できる",
      async ({ action, status }) => {
        const { ticket, ticketRepository, settingsService } =
          setUpTicket(status);
        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
          { memberPermissions: new PermissionsBitField(["Administrator"]) },
        );

        await ticketButtonHandler.execute(interaction as never);

        expect(
          action === "close" ? closeTicket : reopenTicket,
        ).toHaveBeenCalledWith(
          ticket,
          interaction.guild,
          settingsService,
          ticketRepository,
        );
        expect(createErrorEmbed).not.toHaveBeenCalled();
      },
    );

    it("delete: 管理者権限（Administrator）があれば、スタッフロールが無くても削除の確認を出す", async () => {
      setUpTicket("closed");
      const interaction = createMockButtonInteraction(
        "ticket:delete:ticket-1",
        {
          memberPermissions: new PermissionsBitField(["Administrator"]),
        },
      );

      await ticketButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
          flags: MessageFlags.Ephemeral,
        }),
      );
      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:embed.description.delete_warning",
        expect.anything(),
      );
      expect(createErrorEmbed).toHaveBeenCalledTimes(1);
    });

    it("delete-confirm: 管理者権限（Administrator）があれば、スタッフロールが無くても削除する", async () => {
      const { ticket, ticketRepository } = setUpTicket("closed");
      const interaction = createMockButtonInteraction(
        "ticket:delete-confirm:ticket-1",
        { memberPermissions: new PermissionsBitField(["Administrator"]) },
      );

      await ticketButtonHandler.execute(interaction as never);

      expect(deleteTicket).toHaveBeenCalledWith(
        ticket,
        interaction.guild,
        ticketRepository,
      );
    });

    it.each([
      {
        action: "close",
        status: "open",
        key: "ticket:user-response.not_authorized_close_open",
      },
      {
        action: "open",
        status: "closed",
        key: "ticket:user-response.not_authorized_close_open",
      },
      {
        action: "delete",
        status: "closed",
        key: "ticket:user-response.not_authorized_delete",
      },
      {
        action: "delete-confirm",
        status: "closed",
        key: "ticket:user-response.not_authorized_delete",
      },
    ])(
      "$action: 作成者でもスタッフでも管理者でもなければ、誰が操作できるか（スタッフロールのメンション入り）を 権限不足 で本人にだけ返し、Bot の権限も確かめず何も変えない",
      async ({ action, status, key }) => {
        setUpTicket(status);
        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
          { memberPermissions: new PermissionsBitField(["ManageMessages"]) },
        );

        await ticketButtonHandler.execute(interaction as never);

        expect(createErrorEmbed).toHaveBeenCalledWith(
          `${key}:{"staffRoles":"<@&staff-role>"}`,
          expect.objectContaining({ title: "common:title_permission_denied" }),
        );
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({ flags: MessageFlags.Ephemeral }),
        );
        expect(getTicketChannelAccess).not.toHaveBeenCalled();
        expect(interaction.deferReply).not.toHaveBeenCalled();
        expect(closeTicket).not.toHaveBeenCalled();
        expect(reopenTicket).not.toHaveBeenCalled();
        expect(deleteTicket).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
      },
    );

    it.each(["delete", "delete-confirm"])(
      "%s: 作成者でも、スタッフロールも管理者権限も無ければ削除できない",
      async (action) => {
        setUpTicket("closed", "user-1");
        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
        );

        await ticketButtonHandler.execute(interaction as never);

        expect(createErrorEmbed).toHaveBeenCalledWith(
          'ticket:user-response.not_authorized_delete:{"staffRoles":"<@&staff-role>"}',
          expect.anything(),
        );
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(deleteTicket).not.toHaveBeenCalled();
      },
    );
  });

  // パネル（設定）が削除されたカテゴリのチケットは、成功と偽らず操作できない旨を返すことを検証
  describe("設定が無い（パネルが削除された）チケット", () => {
    it.each([
      { action: "close", status: "open" },
      { action: "open", status: "closed" },
      { action: "delete", status: "closed" },
      { action: "delete-confirm", status: "closed" },
    ])(
      "$action: 操作できない旨を本人にだけ返信し、権限確認も操作もしない（成功の応答・ログを出さない）",
      async ({ action, status }) => {
        vi.mocked(getBotTicketRepository).mockReturnValue({
          findById: vi.fn().mockResolvedValue({
            id: "ticket-1",
            guildId: "guild-1",
            categoryId: "cat-1",
            channelId: "channel-1",
            userId: "user-1",
            status,
          }),
        } as never);
        vi.mocked(getBotTicketSettingsService).mockReturnValue({
          findByGuildAndCategory: vi.fn().mockResolvedValue(null),
        } as never);

        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
        );
        await ticketButtonHandler.execute(interaction as never);

        expect(createErrorEmbed).toHaveBeenCalledWith(
          "ticket:user-response.ticket_config_missing",
          expect.anything(),
        );
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({ flags: MessageFlags.Ephemeral }),
        );
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.deferReply).not.toHaveBeenCalled();
        expect(closeTicket).not.toHaveBeenCalled();
        expect(reopenTicket).not.toHaveBeenCalled();
        expect(deleteTicket).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
      },
    );
  });

  // Bot を外して入れ直す前に作ったチケット（Bot の上書きが消えてチャンネルを見られない）は、何も変えずに理由を返すことを検証
  describe("Bot がチャンネルを扱えないチケット", () => {
    it.each([
      { action: "close", status: "open", permissions: "close" },
      { action: "open", status: "closed", permissions: "close" },
      { action: "delete", status: "closed", permissions: "delete" },
      { action: "delete-confirm", status: "closed", permissions: "delete" },
    ])(
      "$action: 操作者の権限を確かめた後、Bot権限不足 として理由と対処を本人にだけ返信し、操作も成功の応答もしない（確かめる権限は $permissions 用）",
      async ({ action, status, permissions }) => {
        vi.mocked(getBotTicketRepository).mockReturnValue({
          findById: vi.fn().mockResolvedValue({
            id: "ticket-1",
            guildId: "guild-1",
            categoryId: "cat-1",
            channelId: "channel-1",
            userId: "user-1",
            status,
          }),
        } as never);
        vi.mocked(getBotTicketSettingsService).mockReturnValue({
          findByGuildAndCategory: vi
            .fn()
            .mockResolvedValue({ staffRoleIds: ["role-1"] }),
        } as never);
        vi.mocked(getTicketChannelAccess).mockResolvedValue({
          status: "inaccessible",
          reason: "channel_permissions",
        });

        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
        );
        await ticketButtonHandler.execute(interaction as never);

        // 削除の経路だけ「チャンネルの管理」も確かめる
        expect(getTicketChannelAccess).toHaveBeenCalledWith(
          interaction.guild,
          "channel-1",
          permissions === "delete"
            ? TICKET_CHANNEL_BOT_DELETE_PERMISSIONS
            : TICKET_CHANNEL_BOT_PERMISSIONS,
        );
        expect(createErrorEmbed).toHaveBeenCalledWith(
          "ticket:user-response.bot_channel_access_missing",
          expect.objectContaining({
            title: "common:title_bot_permission_denied",
          }),
        );
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({ flags: MessageFlags.Ephemeral }),
        );
        expect(interaction.deferReply).not.toHaveBeenCalled();
        expect(closeTicket).not.toHaveBeenCalled();
        expect(reopenTicket).not.toHaveBeenCalled();
        expect(deleteTicket).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
      },
    );
  });

  // 4つの権限はあるが「チャンネルの管理」だけが無いチケットは、削除だけを止めて見直しの案内を返すことを検証
  describe("Bot に「チャンネルの管理」が無いチケット", () => {
    it.each(["delete", "delete-confirm"])(
      "%s: 確認も削除もせず、ロールかチャンネルの権限設定を見直す案内を本人にだけ返信する",
      async (action) => {
        vi.mocked(getBotTicketRepository).mockReturnValue({
          findById: vi.fn().mockResolvedValue({
            id: "ticket-1",
            guildId: "guild-1",
            categoryId: "cat-1",
            channelId: "channel-1",
            userId: "user-1",
            status: "closed",
          }),
        } as never);
        vi.mocked(getBotTicketSettingsService).mockReturnValue({
          findByGuildAndCategory: vi
            .fn()
            .mockResolvedValue({ staffRoleIds: ["role-1"] }),
        } as never);
        vi.mocked(getTicketChannelAccess).mockResolvedValue({
          status: "inaccessible",
          reason: "manage_channels",
        });

        const interaction = createMockButtonInteraction(
          `ticket:${action}:ticket-1`,
        );
        await ticketButtonHandler.execute(interaction as never);

        expect(createErrorEmbed).toHaveBeenCalledWith(
          "ticket:user-response.bot_manage_channels_missing",
          expect.objectContaining({
            title: "common:title_bot_permission_denied",
          }),
        );
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({ flags: MessageFlags.Ephemeral }),
        );
        expect(deleteTicket).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
      },
    );
  });
});
