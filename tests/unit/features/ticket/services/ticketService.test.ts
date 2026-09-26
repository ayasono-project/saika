import { ValidationError } from "@ayasono/shared/core";
import {
  DiscordAPIError,
  PermissionsBitField,
  type PermissionsString,
  RESTJSONErrorCodes,
} from "discord.js";
import {
  closeTicket,
  createTicketChannel,
  deleteTicket,
  reopenTicket,
} from "@/features/ticket/services/ticketService";
import type { Ticket } from "@/shared/database/types";
import { logger } from "@/shared/utils/logger";

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

vi.mock("@/features/ticket/services/ticketAutoDeleteService", () => ({
  scheduleTicketAutoDelete: (...args: unknown[]) =>
    scheduleTicketAutoDeleteMock(...args),
  cancelTicketAutoDelete: (...args: unknown[]) =>
    cancelTicketAutoDeleteMock(...args),
}));

/** createTicketChannel が Bot 自身の上書きで許可する権限（チャンネルを扱うのに要る権限） */
const BOT_CHANNEL_PERMISSIONS: PermissionsString[] = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

/**
 * Bot の通常の権限（上書きで許可する4つと、ロールで持つ「チャンネルの管理」）
 * チケットの削除には「チャンネルの管理」も要る
 */
const BOT_PERMISSIONS_WITH_MANAGE_CHANNELS: PermissionsString[] = [
  ...BOT_CHANNEL_PERMISSIONS,
  "ManageChannels",
];

/**
 * Bot を外して入れ直した後の、それより前に作ったチケットのチャンネルでの Bot の権限
 * （Bot 自身への上書きが消え、@everyone の拒否で「チャンネルを見る」が無い）
 */
const PERMISSIONS_AFTER_REINVITE: PermissionsString[] = [
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

function createMockGuild() {
  const sentMessage = { delete: vi.fn().mockResolvedValue(undefined) };
  const mockChannel = {
    id: "ticket-channel-1",
    send: vi.fn().mockResolvedValue(sentMessage),
    permissionOverwrites: {
      edit: vi.fn().mockResolvedValue(undefined),
    },
    messages: {
      fetch: vi.fn().mockResolvedValue(new Map()),
    },
    delete: vi.fn().mockResolvedValue(undefined),
    permissionsFor: vi.fn(
      () => new PermissionsBitField(BOT_PERMISSIONS_WITH_MANAGE_CHANNELS),
    ),
  };
  return {
    id: "guild-1",
    roles: { everyone: { id: "guild-1" } },
    client: { user: { id: "bot-user-1" } },
    members: { me: { id: "bot-user-1" }, fetchMe: vi.fn() },
    channels: {
      create: vi.fn().mockResolvedValue(mockChannel),
      fetch: vi.fn().mockResolvedValue(mockChannel),
    },
    _mockChannel: mockChannel,
    _sentMessage: sentMessage,
  };
}

/**
 * Bot を外して入れ直した後の古いチケットのチャンネル（Bot が見られない）にする
 * @param guild ギルドのモック
 */
function makeChannelInaccessible(
  guild: ReturnType<typeof createMockGuild>,
): void {
  guild._mockChannel.permissionsFor.mockReturnValue(
    new PermissionsBitField(PERMISSIONS_AFTER_REINVITE),
  );
}

/**
 * 4つの権限はあるが、ロールの「チャンネルの管理」が無い（外された・チャンネルで拒否された）状態にする
 * @param guild ギルドのモック
 */
function makeManageChannelsMissing(
  guild: ReturnType<typeof createMockGuild>,
): void {
  guild._mockChannel.permissionsFor.mockReturnValue(
    new PermissionsBitField(BOT_CHANNEL_PERMISSIONS),
  );
}

/**
 * Discord API のエラーを作る
 * @param code Discord のエラーコード
 * @param status HTTP ステータス
 * @returns DiscordAPIError
 */
function makeApiError(code: number, status: number): DiscordAPIError {
  return new DiscordAPIError(
    { code, message: "api error" },
    code,
    status,
    "POST",
    "/channels/ticket-channel-1/messages",
    {},
  );
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
      staffRoleIds: ["role-staff-1"],
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

  describe("createTicketChannel", () => {
    it("チャンネルを作成し、DB に保存し、初期メッセージを送信すること", async () => {
      const guild = createMockGuild();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      const result = await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "test subject",
        "test detail",
        settingsService as never,
        ticketRepository as never,
      );

      expect(settingsService.findByGuildAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(settingsService.incrementCounter).toHaveBeenCalledWith(
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

    it("Bot 自身への上書きで、チャンネルを扱うのに要る4つの権限（クローズ等の前の確認と同じもの）を許可すること", async () => {
      const guild = createMockGuild();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "test subject",
        "test detail",
        settingsService as never,
        ticketRepository as never,
      );

      const { permissionOverwrites } = guild.channels.create.mock.calls[0][0];
      const botOverwrite = permissionOverwrites.find(
        (overwrite: { id: string }) => overwrite.id === "bot-user-1",
      );
      expect(new PermissionsBitField(botOverwrite.allow).toArray()).toEqual(
        new PermissionsBitField(BOT_CHANNEL_PERMISSIONS).toArray(),
      );
    });

    it("config が見つからない場合にエラーを投げること", async () => {
      const guild = createMockGuild();
      const settingsService = createMockConfigService();
      settingsService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      await expect(
        createTicketChannel(
          guild as never,
          "cat-1",
          "user-1",
          "test subject",
          "test detail",
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toThrow("ticket:user-response.config_not_found");
    });

    it("記録の作成に失敗したら、作ったチャンネルを消してから元のエラーを投げること（記録の無いチャンネルを残さない）", async () => {
      const guild = createMockGuild();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      const dbError = new Error("db create failed");
      ticketRepository.create.mockRejectedValue(dbError);

      await expect(
        createTicketChannel(
          guild as never,
          "cat-1",
          "user-1",
          "test subject",
          "test detail",
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(dbError);

      expect(guild._mockChannel.delete).toHaveBeenCalledTimes(1);
      expect(guild._mockChannel.send).not.toHaveBeenCalled();
    });

    it("作ったチャンネルの削除にも失敗したら warn を出し、元のエラーを投げること", async () => {
      const guild = createMockGuild();
      guild._mockChannel.delete.mockRejectedValue(new Error("delete failed"));
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      const dbError = new Error("db create failed");
      ticketRepository.create.mockRejectedValue(dbError);

      await expect(
        createTicketChannel(
          guild as never,
          "cat-1",
          "user-1",
          "test subject",
          "test detail",
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(dbError);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.unrecorded_channel_delete_failed"),
        expect.any(Error),
      );
    });
  });

  describe("closeTicket", () => {
    it("権限を更新し、ステータスを保存し、自動削除をスケジュールし、通知を送信すること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      // 通知を送ってから記録を更新し、記録を更新してからタイマーを開始する
      expect(guild._mockChannel.send.mock.invocationCallOrder[0]).toBeLessThan(
        ticketRepository.update.mock.invocationCallOrder[0],
      );
      expect(ticketRepository.update.mock.invocationCallOrder[0]).toBeLessThan(
        scheduleTicketAutoDeleteMock.mock.invocationCallOrder[0],
      );
    });

    it("Bot がチャンネルを見られない（Bot を外して入れ直す前に作ったチケット）ときは、記録・タイマー・上書き・通知のどれも変えずに ValidationError を投げること", async () => {
      const guild = createMockGuild();
      makeChannelInaccessible(guild);
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      const error = await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
        ticketRepository as never,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messageKey).toBe(
        "ticket:user-response.bot_channel_access_missing",
      );
      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(scheduleTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
      expect(guild._mockChannel.send).not.toHaveBeenCalled();
    });

    it("クローズ通知の送信に失敗したら、記録もタイマーも上書きも変えずに失敗を返すこと", async () => {
      const guild = createMockGuild();
      const sendError = makeApiError(RESTJSONErrorCodes.MissingAccess, 403);
      guild._mockChannel.send.mockRejectedValue(sendError);
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await expect(
        closeTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(sendError);

      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(scheduleTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
    });

    it("記録の更新に失敗したら、送ったクローズ通知を消し、タイマーも上書きも変えずに失敗を返すこと", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      const dbError = new Error("db update failed");
      ticketRepository.update.mockRejectedValue(dbError);

      await expect(
        closeTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(dbError);

      expect(guild._sentMessage.delete).toHaveBeenCalledTimes(1);
      expect(scheduleTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
    });

    it("config が無い（パネルが削除された）場合は、何もせず成功扱いで戻らず ValidationError を投げること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      settingsService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      const error = await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
        ticketRepository as never,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messageKey).toBe(
        "ticket:user-response.ticket_config_missing",
      );
      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(scheduleTicketAutoDeleteMock).not.toHaveBeenCalled();
    });

    it("自動削除までの時間は、日数からこれまでクローズしていた時間の累計を引いた値で予約すること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket({ elapsedDeleteMs: 1000 });
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
        ticketRepository as never,
      );

      expect(scheduleTicketAutoDeleteMock).toHaveBeenCalledWith(
        1,
        "ticket-channel-1",
        "guild-1",
        7 * 24 * 60 * 60 * 1000 - 1000,
        guild.client,
      );
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      // 通知を送ってから記録を更新し、記録を更新してからタイマーを取り消す
      expect(guild._mockChannel.send.mock.invocationCallOrder[0]).toBeLessThan(
        ticketRepository.update.mock.invocationCallOrder[0],
      );
      expect(ticketRepository.update.mock.invocationCallOrder[0]).toBeLessThan(
        cancelTicketAutoDeleteMock.mock.invocationCallOrder[0],
      );
    });

    it("Bot がチャンネルを見られない（Bot を外して入れ直す前に作ったチケット）ときは、タイマーを取り消さず、記録も上書きも変えずに ValidationError を投げること（実機で DB だけオープンになった食い違いの再発防止）", async () => {
      const guild = createMockGuild();
      makeChannelInaccessible(guild);
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      const error = await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
        ticketRepository as never,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messageKey).toBe(
        "ticket:user-response.bot_channel_access_missing",
      );
      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
      expect(guild._mockChannel.send).not.toHaveBeenCalled();
    });

    it("再オープン通知の送信に失敗（Missing Access）したら、タイマーを取り消さず、記録も上書きも変えずに失敗を返すこと", async () => {
      const guild = createMockGuild();
      const sendError = makeApiError(RESTJSONErrorCodes.MissingAccess, 403);
      guild._mockChannel.send.mockRejectedValue(sendError);
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await expect(
        reopenTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(sendError);

      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
    });

    it("記録の更新に失敗したら、送った再オープン通知を消し、タイマーを取り消さずに失敗を返すこと（クローズのまま自動削除が続く）", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(Date.now() - 1000),
      });
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      const dbError = new Error("db update failed");
      ticketRepository.update.mockRejectedValue(dbError);

      await expect(
        reopenTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBe(dbError);

      expect(guild._sentMessage.delete).toHaveBeenCalledTimes(1);
      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(
        guild._mockChannel.permissionOverwrites.edit,
      ).not.toHaveBeenCalled();
    });

    it("config が無い（パネルが削除された）場合は、何もせず成功扱いで戻らず ValidationError を投げること", async () => {
      const guild = createMockGuild();
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(),
      });
      const settingsService = createMockConfigService();
      settingsService.findByGuildAndCategory.mockResolvedValue(null);
      const ticketRepository = createMockTicketRepository();

      const error = await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
        ticketRepository as never,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messageKey).toBe(
        "ticket:user-response.ticket_config_missing",
      );
      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
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

    it("Discord がチャンネルは無い（Unknown Channel）と返したら、記録とタイマーだけを片付けること", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockRejectedValue(
        makeApiError(RESTJSONErrorCodes.UnknownChannel, 404),
      );
      const ticket = createMockTicket();
      const ticketRepository = createMockTicketRepository();

      await deleteTicket(ticket, guild as never, ticketRepository as never);

      expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(1, "guild-1");
      expect(ticketRepository.delete).toHaveBeenCalledWith(1);
      expect(guild._mockChannel.delete).not.toHaveBeenCalled();
    });

    it.each([
      [
        "Bot がチャンネルを見られない（Bot を外して入れ直す前に作ったチケット）",
        (guild: ReturnType<typeof createMockGuild>) =>
          makeChannelInaccessible(guild),
      ],
      [
        "チャンネルの取得が Missing Access で失敗した",
        (guild: ReturnType<typeof createMockGuild>) =>
          guild.channels.fetch.mockRejectedValue(
            makeApiError(RESTJSONErrorCodes.MissingAccess, 403),
          ),
      ],
    ])(
      "%sときは、記録もタイマーも消さずに ValidationError を投げること（チャンネルだけが残らないように）",
      async (_label, arrange) => {
        const guild = createMockGuild();
        arrange(guild);
        const ticket = createMockTicket();
        const ticketRepository = createMockTicketRepository();

        const error = await deleteTicket(
          ticket,
          guild as never,
          ticketRepository as never,
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).messageKey).toBe(
          "ticket:user-response.bot_channel_access_missing",
        );
        expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
        expect(ticketRepository.delete).not.toHaveBeenCalled();
        expect(guild._mockChannel.delete).not.toHaveBeenCalled();
      },
    );

    it("4つの権限はあるが「チャンネルの管理」が無いときは、記録もタイマーも消さず、ロールかチャンネルの権限設定を見直す案内の ValidationError を投げること（記録の無いチャンネルを残さない）", async () => {
      const guild = createMockGuild();
      makeManageChannelsMissing(guild);
      const ticket = createMockTicket();
      const ticketRepository = createMockTicketRepository();

      const error = await deleteTicket(
        ticket,
        guild as never,
        ticketRepository as never,
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messageKey).toBe(
        "ticket:user-response.bot_manage_channels_missing",
      );
      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
      expect(ticketRepository.delete).not.toHaveBeenCalled();
      expect(guild._mockChannel.delete).not.toHaveBeenCalled();
    });

    it("チャンネルの削除に失敗したら warn を出すこと（記録は削除済み）", async () => {
      const guild = createMockGuild();
      guild._mockChannel.delete.mockRejectedValue(new Error("delete failed"));
      const ticket = createMockTicket();
      const ticketRepository = createMockTicketRepository();

      await deleteTicket(ticket, guild as never, ticketRepository as never);

      expect(ticketRepository.delete).toHaveBeenCalledWith(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_channel_delete_failed"),
        expect.any(Error),
      );
    });
  });

  // クローズ・再オープンはチャンネルを消さないので、「チャンネルの管理」を求めないことを検証
  describe("「チャンネルの管理」が無いチャンネル", () => {
    it("クローズはできること", async () => {
      const guild = createMockGuild();
      makeManageChannelsMissing(guild);
      const ticketRepository = createMockTicketRepository();

      await closeTicket(
        createMockTicket(),
        guild as never,
        createMockConfigService() as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "closed" }),
      );
      expect(scheduleTicketAutoDeleteMock).toHaveBeenCalled();
    });

    it("再オープンはできること", async () => {
      const guild = createMockGuild();
      makeManageChannelsMissing(guild);
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        createMockTicket({ status: "closed", closedAt: new Date() }),
        guild as never,
        createMockConfigService() as never,
        ticketRepository as never,
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "open" }),
      );
      expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(1, "guild-1");
    });
  });

  describe("createTicketChannel - guild.client.user が null の場合", () => {
    it("Bot ユーザー権限オーバーライドなしでもチャンネルが作成されること", async () => {
      const guild = createMockGuild();
      (guild.client as Record<string, unknown>).user = null;
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      ticketRepository.create.mockResolvedValue(
        createMockTicket({ id: "new-ticket" }),
      );
      settingsService.incrementCounter.mockResolvedValue(1);

      const result = await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "件名",
        "詳細",
        settingsService as never,
        ticketRepository as never,
      );

      expect(result.channel).toBeDefined();
      expect(guild.channels.create).toHaveBeenCalled();
    });
  });

  describe("closeTicket - チャンネル取得失敗", () => {
    it("チャンネルが取れない場合は、記録もタイマーも変えずに ValidationError を投げること（チャンネルを操作できないまま記録だけクローズにしない）", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockResolvedValue(null);
      const ticket = createMockTicket();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await expect(
        closeTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(scheduleTicketAutoDeleteMock).not.toHaveBeenCalled();
    });
  });

  describe("reopenTicket - チャンネル取得失敗", () => {
    it("チャンネルが取れない場合は、記録もタイマーも変えずに ValidationError を投げること", async () => {
      const guild = createMockGuild();
      guild.channels.fetch.mockResolvedValue(null);
      const ticket = createMockTicket({
        status: "closed",
        closedAt: new Date(),
      });
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await expect(
        reopenTicket(
          ticket,
          guild as never,
          settingsService as never,
          ticketRepository as never,
        ),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(ticketRepository.update).not.toHaveBeenCalled();
      expect(cancelTicketAutoDeleteMock).not.toHaveBeenCalled();
    });
  });

  describe("createTicketChannel - メンション送信", () => {
    it("チケット作成後に作成者とスタッフロールへのメンションを送信すること", async () => {
      const guild = createMockGuild();
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();
      ticketRepository.create.mockResolvedValue(
        createMockTicket({ id: "new-ticket" }),
      );
      settingsService.incrementCounter.mockResolvedValue(1);

      await createTicketChannel(
        guild as never,
        "cat-1",
        "user-1",
        "件名",
        "詳細",
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      // エラーが外部に漏れないこと
      await expect(
        reopenTicket(
          ticket,
          guild as never,
          settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
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
      const settingsService = createMockConfigService();
      const ticketRepository = createMockTicketRepository();

      await reopenTicket(
        ticket,
        guild as never,
        settingsService as never,
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
