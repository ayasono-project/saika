// 保留した自動削除の再試行を、本物のスケジューラーで検証するテスト
// （発火中のジョブから同じIDで予約し直せること・既存の取り消しが再試行の予約にも効くこと）

const ticketRepositoryMock = {
  findById: vi.fn(),
  deleteIfClosed: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAllClosedByGuild: vi.fn(),
};
const settingsServiceMock = { findByGuildAndCategory: vi.fn() };

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketRepository: () => ticketRepositoryMock,
  getBotTicketSettingsService: () => settingsServiceMock,
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { PermissionsBitField, type PermissionsString } from "discord.js";
import { stopGuildJobsUsecase } from "@/features/guild-settings/usecases/stopGuildJobsUsecase";
import {
  cancelTicketAutoDelete,
  scheduleTicketAutoDelete,
} from "@/features/ticket/services/ticketAutoDeleteService";
import {
  deleteTicket,
  reopenTicket,
} from "@/features/ticket/services/ticketService";
import type { Ticket } from "@/shared/database/types";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";
import { logger } from "@/shared/utils/logger";

/** 保留したときに予約し直すまでの時間（1時間） */
const HOLD_RETRY_MS = 60 * 60 * 1000;

/** 最初の予約から発火までの時間 */
const FIRST_DELAY_MS = 1000;

/** チケットの自動削除ジョブのID */
const JOB_ID = "ticket-auto-delete-ticket-1";

/** Bot がチケットのチャンネルを扱うのに要る権限（クローズ・再オープンに要る） */
const BOT_CHANNEL_PERMISSIONS: PermissionsString[] = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

/** チャンネルを消すのに要る権限（扱う権限と、ロールで持つ「チャンネルの管理」） */
const BOT_DELETE_PERMISSIONS: PermissionsString[] = [
  ...BOT_CHANNEL_PERMISSIONS,
  "ManageChannels",
];

/**
 * チケットのチャンネル・ギルド・クライアントのモックを作る
 * @param permissions チャンネルでの Bot の権限
 * @returns チャンネルとギルドのモック（ギルドの client.guilds.fetch は自身を返す）
 */
function createGuild(permissions: PermissionsString[]) {
  const channel = {
    id: "channel-1",
    send: vi.fn().mockResolvedValue({ delete: vi.fn() }),
    permissionOverwrites: { edit: vi.fn().mockResolvedValue(undefined) },
    messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
    delete: vi.fn().mockResolvedValue(undefined),
    permissionsFor: vi.fn(() => new PermissionsBitField(permissions)),
  };
  const guild = {
    id: "guild-1",
    client: { user: { id: "bot-user-1" }, guilds: { fetch: vi.fn() } },
    members: { me: { id: "bot-user-1" }, fetchMe: vi.fn() },
    channels: { fetch: vi.fn().mockResolvedValue(channel) },
  };
  guild.client.guilds.fetch.mockResolvedValue(guild);
  return { channel, guild };
}

// 保留した自動削除の予約し直しと、その取り消しを、本物のスケジューラーとタイマーで検証
describe("features/ticket/services/ticketAutoDeleteService（保留後の再試行）", () => {
  let ticket: Ticket;

  // 時刻を進めて発火させるため偽のタイマーにし、クローズ済みのチケット1件を記録と設定ごと用意する
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "cat-1",
      channelId: "channel-1",
      userId: "user-1",
      status: "closed",
      elapsedDeleteMs: 0,
      closedAt: new Date(),
    } as Ticket;
    ticketRepositoryMock.findById.mockImplementation(async () => ticket);
    ticketRepositoryMock.deleteIfClosed.mockResolvedValue(true);
    ticketRepositoryMock.update.mockImplementation(
      async (_id: string, data: Partial<Ticket>) => {
        ticket = { ...ticket, ...data };
        return ticket;
      },
    );
    ticketRepositoryMock.delete.mockResolvedValue(undefined);
    ticketRepositoryMock.findAllClosedByGuild.mockImplementation(async () =>
      ticket.status === "closed" ? [ticket] : [],
    );
    settingsServiceMock.findByGuildAndCategory.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "cat-1",
      staffRoleIds: [],
      autoDeleteDays: 7,
    });
  });

  // シングルトンのスケジューラーにジョブを残さず、時刻も戻す
  afterEach(() => {
    jobScheduler.stopAll();
    vi.useRealTimers();
  });

  /**
   * 自動削除を予約して発火させ、保留させる（保留で予約し直されたことまで確かめる）
   * @param guild ギルドのモック
   * @returns 実行完了を示す Promise
   */
  async function scheduleAndHold(
    guild: ReturnType<typeof createGuild>["guild"],
  ): Promise<void> {
    scheduleTicketAutoDelete(
      "ticket-1",
      "channel-1",
      "guild-1",
      FIRST_DELAY_MS,
      guild.client as never,
    );
    await vi.advanceTimersByTimeAsync(FIRST_DELAY_MS);

    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);
    expect(ticketRepositoryMock.deleteIfClosed).not.toHaveBeenCalled();
    expect(jobScheduler.hasJob(JOB_ID)).toBe(true);
  }

  it("発火中のジョブから同じIDで1時間後に予約し直し、権限を付け直した後の再試行で削除する", async () => {
    const { channel, guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    // 1時間たつまでは再試行しない
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS - 1);
    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);

    // 管理者が Bot のロールに「チャンネルの管理」を付け直すと、次の再試行で削除する
    channel.permissionsFor.mockReturnValue(
      new PermissionsBitField(BOT_DELETE_PERMISSIONS),
    );
    await vi.advanceTimersByTimeAsync(1);

    expect(ticketRepositoryMock.deleteIfClosed).toHaveBeenCalledWith(
      "ticket-1",
    );
    expect(channel.delete).toHaveBeenCalled();
    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
  });

  it("保留を知らせる warn は最初の1回だけで、再試行でまた保留になったときは debug にする", async () => {
    const { guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS * 2);

    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(3);
    const heldWarns = vi
      .mocked(logger.warn)
      .mock.calls.filter(([message]) =>
        String(message).includes(
          "ticket:log.auto_delete_held_channel_inaccessible",
        ),
      );
    expect(heldWarns).toHaveLength(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("ticket:log.auto_delete_still_held"),
    );
    expect(jobScheduler.hasJob(JOB_ID)).toBe(true);
  });

  it("再オープンすると、再試行の予約も取り消す", async () => {
    // 「チャンネルの管理」だけが無いチャンネルは、自動削除は保留になるが再オープンはできる
    const { guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    await reopenTicket(
      ticket,
      guild as never,
      settingsServiceMock as never,
      ticketRepositoryMock as never,
    );

    expect(ticket.status).toBe("open");
    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS);
    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);
  });

  it("手動で削除すると、再試行の予約も取り消す", async () => {
    // ギルドを一時的に取得できずに保留した後、手動で削除する
    const { guild } = createGuild(BOT_DELETE_PERMISSIONS);
    guild.client.guilds.fetch.mockRejectedValueOnce(new Error("unavailable"));
    await scheduleAndHold(guild);

    await deleteTicket(ticket, guild as never, ticketRepositoryMock as never);

    expect(ticketRepositoryMock.delete).toHaveBeenCalledWith("ticket-1");
    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS);
    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);
  });

  it("チャンネル削除・撤去で使う cancelTicketAutoDelete で、再試行の予約も取り消す", async () => {
    const { guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    cancelTicketAutoDelete("ticket-1", "guild-1");

    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS);
    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);
  });

  it("Bot がサーバーから外されたとき（stopGuildJobsUsecase）に、再試行の予約も取り消す", async () => {
    const { guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    await stopGuildJobsUsecase(
      {
        ticketRepository: ticketRepositoryMock as never,
        bumpReminderManager: {
          cancelAllForGuild: vi.fn().mockResolvedValue(undefined),
        } as never,
      },
      "guild-1",
    );

    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS);
    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(1);
  });

  it("パネルが削除された（設定が無い）後の再試行では、削除せず、それ以上予約し直さない", async () => {
    const { guild } = createGuild(BOT_CHANNEL_PERMISSIONS);
    await scheduleAndHold(guild);

    settingsServiceMock.findByGuildAndCategory.mockResolvedValue(null);
    await vi.advanceTimersByTimeAsync(HOLD_RETRY_MS);

    expect(ticketRepositoryMock.findById).toHaveBeenCalledTimes(2);
    expect(ticketRepositoryMock.deleteIfClosed).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("ticket:log.auto_delete_held_config_missing"),
    );
    expect(jobScheduler.hasJob(JOB_ID)).toBe(false);
  });
});
