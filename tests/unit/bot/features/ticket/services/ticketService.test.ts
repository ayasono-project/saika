// tests/unit/bot/features/ticket/services/ticketService.test.ts

import {
  closeTicket,
  createTicketChannel,
  deleteTicket,
  hasStaffRole,
  hasTicketPermission,
  reopenTicket,
} from "@/bot/features/ticket/services/ticketService";
import type { Ticket } from "@/shared/database/types";

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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const scheduleTicketAutoDeleteMock = vi.fn();
const cancelTicketAutoDeleteMock = vi.fn();

vi.mock("@/bot/features/ticket/services/ticketAutoDeleteService", () => ({
  scheduleTicketAutoDelete: (...args: unknown[]) =>
    scheduleTicketAutoDeleteMock(...args),
  cancelTicketAutoDelete: (...args: unknown[]) =>
    cancelTicketAutoDeleteMock(...args),
}));

function createMockGuild() {
  const mockChannel = {
    id: "ticket-channel-1",
    send: vi.fn().mockResolvedValue(undefined),
    permissionOverwrites: {
      edit: vi.fn().mockResolvedValue(undefined),
    },
    messages: {
      fetch: vi.fn().mockResolvedValue(new Map()),
    },
    delete: vi.fn().mockResolvedValue(undefined),
  };
  return {
    id: "guild-1",
    roles: { everyone: { id: "guild-1" } },
    client: { user: { id: "bot-user-1" } },
    channels: {
      create: vi.fn().mockResolvedValue(mockChannel),
      fetch: vi.fn().mockResolvedValue(mockChannel),
    },
    _mockChannel: mockChannel,
  };
}

function createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    guildId: "guild-1",
    categoryId: "cat-1",
    channelId: "ticket-channel-1",
    userId: "user-1",
    ticketNumber: 1,
    subject: "test subject",
    status: "open",
    elapsedDeleteMs: 0,
    closedAt: null,
    createdAt: new Date(),
    ...overrides,
  } as Ticket;
}

function createMockConfigService() {
  return {
    findByGuildAndCategory: vi.fn().mockResolvedValue({
      guildId: "guild-1",
      categoryId: "cat-1",
      staffRoleIds: '["role-staff-1"]',
      autoDeleteDays: 7,
      panelColor: "#00A8F3",
    }),
    incrementCounter: vi.fn().mockResolvedValue(1),
  };
}

function createMockTicketRepository() {
  return {
    create: vi.fn().mockResolvedValue({
      id: 1,
      guildId: "guild-1",
      categoryId: "cat-1",
      channelId: "ticket-channel-1",
      userId: "user-1",
      ticketNumber: 1,
      subject: "test subject",
      status: "open",
      elapsedDeleteMs: 0,
      closedAt: null,
    }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

// ticketService の各ビジネスロジック関数を検証する
describe("bot/features/ticket/services/ticketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasTicketPermission", () => {
    it("userId がチケットの userId と一致する場合に true を返すこと", () => {
      const ticket = createMockTicket({ userId: "user-1" });

      const result = hasTicketPermission(ticket, "user-1", [], []);

      expect(result).toBe(true);
    });

    it("メンバーがスタッフロールを持っている場合に true を返すこと", () => {
      const ticket = createMockTicket({ userId: "user-1" });

      const result = hasTicketPermission(
        ticket,
        "user-2",
        ["role-staff-1", "role-other"],
        ["role-staff-1"],
      );

      expect(result).toBe(true);
    });

    it("チケット作成者でもスタッフロール保有者でもない場合に false を返すこと", () => {
      const ticket = createMockTicket({ userId: "user-1" });

      const result = hasTicketPermission(
        ticket,
        "user-2",
        ["role-other"],
        ["role-staff-1"],
      );

      expect(result).toBe(false);
    });
  });

  describe("hasStaffRole", () => {
    it("メンバーがスタッフロールを持っている場合に true を返すこと", () => {
      const result = hasStaffRole(
        ["role-staff-1", "role-other"],
        ["role-staff-1"],
      );

      expect(result).toBe(true);
    });

    it("メンバーがスタッフロールを持っていない場合に false を返すこと", () => {
      const result = hasStaffRole(["role-other"], ["role-staff-1"]);

      expect(result).toBe(false);
    });
  });

  describe("createTicketChannel", () => {
    it("チャンネルを作成し、DB に保存し、初期メッセージを送信すること", async () => {
      const guild = createMockGuild();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      const result = await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "test subject",
        "test detail",
        configService as never,
        ticketRepository as never,
      );

      expect(configService.findByGuildAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(configService.incrementCounter).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(guild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ticket-1",
          parent: "cat-1",
        }),
      );
      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: "guild-1",
          categoryId: "cat-1",
          channelId: "ticket-channel-1",
          userId: "user-1",
          ticketNumber: 1,
          subject: "test subject",
          status: "open",
        }),
      );
      expect(guild._mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
      expect(result.ticket).toBeDefined();
      expect(result.channel).toBeDefined();
    });

    it("config が見つからない場合にエラーを投げること", async () => {
      const guild = createMockGuild();
      const configService = createMockConfigService();
      configService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      await expect(
        createTicketChannel(
          guild as never,
          "cat-1",
          "user-1",
          "test subject",
          "test detail",
          configService as never,
          ticketRepository as never,
        ),
      ).rejects.toThrow("ticket:user-response.config_not_found");
    });
  });

  describe("closeTicket", () => {
    it("権限を更新し、ステータスを保存し、自動削除をスケジュールし、通知を送信すること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      // 権限更新
      expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        "user-1",
        { SendMessages: false },
      );
      // スタッフロールの権限更新
      expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        "role-staff-1",
        { SendMessages: false },
      );
      // ステータス更新
      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "closed",
          closedAt: expect.any(Date),
        }),
      );
      // 自動削除スケジュール
      expect(scheduleTicketAutoDeleteMock).toHaveBeenCalledWith(
        1,
        "ticket-channel-1",
        "guild-1",
        expect.any(Number),
        guild.client,
      );
      // 通知送信
      expect(guild._mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });

    it("config が見つからない場合に早期リターンすること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const configService = createMockConfigService();
      configService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).not.toHaveBeenCalled();
    });

    it("前回の再オープン通知を検知して削除すること", async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined);
      const reopenNotificationMsg = {
        author: { id: "bot-user-1" },
        embeds: [{ title: "ticket:embed.title.reopened" }],
        components: [{ components: [{ customId: "ticket:close:ticket-1" }] }],
        delete: deleteMock,
      };
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockResolvedValue(
        new Map([["msg-reopen", reopenNotificationMsg]]),
      );

      const ticket = createMockTicket();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(deleteMock).toHaveBeenCalled();
    });

    it("初期メッセージは削除しないこと", async () => {
      const deleteMock = vi.fn();
      const initialMsg = {
        author: { id: "bot-user-1" },
        embeds: [{ title: "ticket:embed.title.ticket" }],
        components: [{ components: [{ customId: "ticket:close:ticket-1" }] }],
        delete: deleteMock,
      };
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockResolvedValue(
        new Map([["msg-initial", initialMsg]]),
      );

      const ticket = createMockTicket();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });

  describe("reopenTicket", () => {
    it("権限を復元し、タイマーをキャンセルし、ステータスを保存し、通知を送信すること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      // タイマーキャンセル
      expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(1, "guild-1");
      // 権限復元
      expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        "user-1",
        { SendMessages: true },
      );
      expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        "role-staff-1",
        { SendMessages: true },
      );
      // ステータス更新
      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "open",
          elapsedDeleteMs: expect.any(Number),
          closedAt: null,
        }),
      );
      // 通知送信（embeds + components 付き）
      expect(guild._mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });

    it("config が見つからない場合に早期リターンすること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const configService = createMockConfigService();
      configService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteTicket", () => {
    it("タイマーをキャンセルし、DB から削除し、チャンネルを削除すること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const ticketRepository = createMockTicketRepository();

      await deleteTicket(ticket, guild as never, ticketRepository as never);

      // タイマーキャンセル
      expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(1, "guild-1");
      // DB 削除
      expect(ticketRepository.delete).toHaveBeenCalledWith(1);
      // チャンネル削除
      expect(guild.channels.fetch).toHaveBeenCalledWith("ticket-channel-1");
      expect(guild._mockChannel.delete).toHaveBeenCalled();
    });

    it("チャンネルが見つからない場合でも DB 削除は行われること", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockResolvedValue(null);
      const ticket = createMockTicket();
      const ticketRepository = createMockTicketRepository();

      await deleteTicket(ticket, guild as never, ticketRepository as never);

      expect(ticketRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("createTicketChannel - guild.client.user が null の場合", () => {
    it("Bot ユーザー権限オーバーライドなしでもチャンネルが作成されること", async () => {
      const guild = createMockGuild();
      (guild.client as Record<string, unknown>).user = null;
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      ticketRepository.create.mockResolvedValue(
        createMockTicket({ id: "new-ticket" }),
      );
      configService.incrementCounter.mockResolvedValue(1);

      const result = await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "件名",
        "詳細",
        configService as never,
        ticketRepository as never,
      );

      expect(result.channel).toBeDefined();
      expect(guild.channels.create).toHaveBeenCalled();
    });
  });

  describe("closeTicket - チャンネル取得失敗", () => {
    it("チャンネルが null の場合でもステータス更新とタイマー開始は行われること", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockResolvedValue(null);
      const ticket = createMockTicket();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "closed" }),
      );
      expect(scheduleTicketAutoDeleteMock).toHaveBeenCalled();
    });
  });

  describe("reopenTicket - チャンネル取得失敗", () => {
    it("チャンネルが null の場合でもステータス更新は行われること", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockResolvedValue(null);
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "open" }),
      );
    });
  });

  describe("createTicketChannel - メンション送信", () => {
    it("チケット作成後に作成者とスタッフロールへのメンションを送信すること", async () => {
      const guild = createMockGuild();
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      ticketRepository.create.mockResolvedValue(
        createMockTicket({ id: "new-ticket" }),
      );
      configService.incrementCounter.mockResolvedValue(1);

      await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "件名",
        "詳細",
        configService as never,
        ticketRepository as never,
      );

      // send が2回呼ばれる（メンション + 初期メッセージ）
      expect(guild._mockChannel.send).toHaveBeenCalledTimes(2);
      // 1回目がメンション文字列
      const mentionCall = guild._mockChannel.send.mock.calls[0][0];
      expect(mentionCall).toContain("<@user-1>");
      expect(mentionCall).toContain("<@&role-staff-1>");
    });
  });

  describe("reopenTicket - クローズ通知ボタン無効化", () => {
    it("クローズ通知メッセージを検知して削除すること", async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined);
      const closeNotificationMsg = {
        author: { id: "bot-user-1" },
        components: [
          {
            components: [{ customId: "ticket:open:ticket-1" }],
          },
        ],
        embeds: [],
        delete: deleteMock,
      };
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockResolvedValue(
        new Map([["msg-close", closeNotificationMsg]]),
      );

      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(deleteMock).toHaveBeenCalled();
    });

    it("再オープンボタンがないメッセージは削除しないこと", async () => {
      const deleteMock = vi.fn();
      const otherMsg = {
        author: { id: "bot-user-1" },
        components: [
          {
            components: [{ customId: "ticket:delete:ticket-1" }],
          },
        ],
        embeds: [],
        delete: deleteMock,
      };
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockResolvedValue(
        new Map([["msg-other", otherMsg]]),
      );

      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("messages.fetch が失敗した場合でもエラーにならないこと", async () => {
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockRejectedValue(
        new Error("fetch error"),
      );

      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      // エラーが外部に漏れないこと
      await expect(
        reopenTicket(
          ticket,
          guild as never,
          configService as never,
          ticketRepository as never,
        ),
      ).resolves.toBeUndefined();
    });

    it("Botのメッセージでない場合はスキップすること", async () => {
      const editMock = vi.fn();
      const userMsg = {
        author: { id: "other-user" },
        components: [
          {
            components: [{ customId: "ticket:open:ticket-1" }],
          },
        ],
        edit: editMock,
      };
      const guild = createMockGuild();
      guild._mockChannel.messages.fetch.mockResolvedValue(
        new Map([["msg-user", userMsg]]),
      );

      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(editMock).not.toHaveBeenCalled();
    });

    it("closedAt が null の場合でも elapsedDeleteMs がそのまま保持されること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket({
        status: "closed",
        closedAt: null,
        elapsedDeleteMs: 5000,
      });
      const configService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        configService as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          elapsedDeleteMs: 5000,
        }),
      );
    });
  });
});
