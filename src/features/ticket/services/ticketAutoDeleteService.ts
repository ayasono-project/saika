// チケット自動削除サービス

import type { Client } from "discord.js";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../bot/services/botCompositionRoot";
import type { ITicketRepository } from "../../../shared/database/types";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { jobScheduler } from "../../../shared/scheduler/jobScheduler";
import { logger } from "../../../shared/utils/logger";
import {
  TICKET_AUTO_DELETE_HOLD_RETRY_MS,
  TICKET_AUTO_DELETE_JOB_PREFIX,
  TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  TICKET_STATUS,
} from "../commands/ticketCommand.constants";
import { computeAutoDeleteRemainingMs } from "./ticketAutoDeleteTime";
import { getTicketChannelAccess } from "./ticketChannelAccess";

/**
 * 自動削除の予約の張り方
 */
interface AutoDeleteScheduleOptions {
  /**
   * 既に予約があるチケットも、予約を置き換える。パネルを作り直したとき（resumeAutoDeleteForCategory）に使う。
   * 残っている予約は作り直す前の設定の日数で計算されているため、置き換えないと新しい設定より早く、
   * または遅く消える。置き換えは想定どおりの動作なので、スケジューラーの置き換えの warn は出さない
   */
  replaceExisting?: boolean;
}

/**
 * 自動削除の予約を組み直す範囲と張り方
 */
interface RestoreAutoDeleteTimersOptions extends AutoDeleteScheduleOptions {
  /** 指定するとそのカテゴリのチケットだけを組み直す */
  categoryId?: string;
}

/**
 * 自動削除のジョブの張り方（予約と、保留した後の再試行で共通）
 */
interface AutoDeleteJobOptions {
  /** 既存の同じIDの予約を置き換えても、スケジューラーの warn を出さない */
  quiet?: boolean;
  /**
   * 保留した後の再試行として張る。発火してまた保留になったときは、warn を繰り返さず debug にする
   * （同じチケットの保留を warn で知らせるのは最初の1回だけにする）
   */
  retryingHold?: boolean;
}

/**
 * チケットの自動削除ジョブのIDを組み立てる
 * @param ticketId チケットID
 * @returns ジョブID
 */
function toAutoDeleteJobId(ticketId: string): string {
  return `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticketId}`;
}

/**
 * 自動削除のジョブを、チケットごとに同じジョブIDで張る（同じIDの予約があれば置き換える）
 * 予約（scheduleTicketAutoDelete）と、保留した後の再試行（holdAutoDeleteAndRetry）で共通。
 * 同じIDにするので、再オープン・削除などでの取り消しは、どちらで張ったジョブにも効く
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param delayMs 削除までの遅延ミリ秒
 * @param client Discord クライアント
 * @param options quiet で置き換えの warn を抑え、retryingHold で再試行として張る（再試行は予約のログを debug で出す）
 * @returns ジョブID
 */
function armAutoDeleteJob(
  ticketId: string,
  channelId: string,
  guildId: string,
  delayMs: number,
  client: Client,
  options: AutoDeleteJobOptions = {},
): string {
  const jobId = toAutoDeleteJobId(ticketId);
  const retryingHold = options.retryingHold ?? false;

  const task = async (): Promise<void> => {
    await executeAutoDelete(ticketId, channelId, guildId, client, retryingHold);
  };
  if (retryingHold) {
    // 再試行は権限が戻るまで1時間ごとに張り直すので、予約のたびの info は出さない（最初の保留で warn を出している）
    jobScheduler.addOneTimeJob(jobId, delayMs, task, {
      scheduledLogLevel: "debug",
    });
  } else if (options.quiet) {
    jobScheduler.addOneTimeJob(jobId, delayMs, task, { quiet: true });
  } else {
    jobScheduler.addOneTimeJob(jobId, delayMs, task);
  }
  return jobId;
}

/**
 * 自動削除タイマーを開始する（同じチケットの予約があれば置き換える）
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param delayMs 削除までの遅延ミリ秒
 * @param client Discord クライアント
 * @param options replaceExisting を立てると、既存の予約の置き換えを想定どおりとして warn を出さない
 */
export function scheduleTicketAutoDelete(
  ticketId: string,
  channelId: string,
  guildId: string,
  delayMs: number,
  client: Client,
  options: AutoDeleteScheduleOptions = {},
): void {
  const jobId = armAutoDeleteJob(
    ticketId,
    channelId,
    guildId,
    delayMs,
    client,
    {
      quiet: options.replaceExisting ?? false,
    },
  );

  // スケジューラーは NaN・Infinity の遅延を拒否する（エラーログは向こうが出す）。
  // 予約できたときだけ「予約した」と残し、ログが実際と食い違わないようにする
  if (!jobScheduler.hasJob(jobId)) return;
  logger.info(
    logPrefixed(
      "system:log_prefix.ticket",
      "ticket:log.auto_delete_scheduled",
      {
        guildId,
        channelId,
        delayMs: String(delayMs),
      },
    ),
  );
}

/**
 * 自動削除タイマーをキャンセルする
 * 保留した後の再試行も同じジョブIDで張るので、再試行の予約もここで取り消せる
 * @param ticketId チケットID
 * @param guildId ギルドID
 */
export function cancelTicketAutoDelete(
  ticketId: string,
  guildId: string,
): void {
  const jobId = toAutoDeleteJobId(ticketId);
  if (jobScheduler.hasJob(jobId)) {
    jobScheduler.removeJob(jobId);
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_cancelled",
        { guildId, ticketId },
      ),
    );
  }
}

/**
 * 自動削除を保留し、TICKET_AUTO_DELETE_HOLD_RETRY_MS 後に同じジョブIDで予約し直す
 *
 * 単発のジョブは発火時にスケジューラーから消える（jobScheduler はマップから消してからコールバックを
 * 呼ぶので、コールバックの中から同じIDで張り直せる）。予約し直さないと、管理者が権限を付け直しても
 * 次の再起動・再接続・再導入まで削除されない。同じIDなので、再オープン・削除・チャンネル削除・
 * 退出（stopGuildJobsUsecase）・撤去での取り消しは、再試行の予約にも効く。
 * 保留を知らせる warn は最初の1回だけにし、再試行でまた保留になったときは debug にする
 * （1時間ごとに warn が並ばないように）。何回目の保留かはジョブのコールバックに持たせるので、
 * 取り消されたり削除できたりした後にモジュールに状態が残ることはない
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param client Discord クライアント
 * @param retryingHold 保留した後の再試行で、また保留になったか
 */
function holdAutoDeleteAndRetry(
  ticketId: string,
  channelId: string,
  guildId: string,
  client: Client,
  retryingHold: boolean,
): void {
  const message = logPrefixed(
    "system:log_prefix.ticket",
    retryingHold
      ? "ticket:log.auto_delete_still_held"
      : "ticket:log.auto_delete_held_channel_inaccessible",
    {
      guildId,
      channelId,
      ticketId,
      retryInMs: String(TICKET_AUTO_DELETE_HOLD_RETRY_MS),
    },
  );
  if (retryingHold) {
    logger.debug(message);
  } else {
    logger.warn(message);
  }

  // 確かめている間に、別の経路（パネルの再設置など）が同じチケットを予約し直していれば、そちらを残す
  if (jobScheduler.hasJob(toAutoDeleteJobId(ticketId))) return;
  armAutoDeleteJob(
    ticketId,
    channelId,
    guildId,
    TICKET_AUTO_DELETE_HOLD_RETRY_MS,
    client,
    { retryingHold: true },
  );
}

/**
 * 自動削除を実行する
 *
 * 予約した時点の情報では消さず、発火時に記録と設定を読み直してから消す。
 * - 記録が無い・クローズ済みでない: 予約の後に削除・再オープンされている（起動時の復元の途中で
 *   再オープンされると、オープン中のチケットに古い予約が残ることがある）ので、何もしない
 * - カテゴリの設定が無い: パネルが削除されたチケットは自動削除を止める（予約し直さない）。再起動後の復元も
 *   設定が無いと予約しないので、再起動の前後で扱いを揃える。同じカテゴリにパネルを
 *   作り直すと resumeAutoDeleteForCategory で予約し直す
 * - Bot がチャンネルを扱えない（Bot を外して入れ直した後の、それより前に作ったチケット等）・「チャンネルの管理」が
 *   無い・ギルドを取れない: 記録を消さずに保留し、TICKET_AUTO_DELETE_HOLD_RETRY_MS 後に予約し直す
 *   （holdAutoDeleteAndRetry）。記録だけ消すと、Bot から二度と操作できないチャンネルが残るため。
 *   管理者が権限を付け直せば、その後の再試行で削除する
 * - チャンネルが無いと確定した: 記録だけを消す
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param client Discord クライアント
 * @param retryingHold 保留した後の再試行として発火したか（また保留になったときのログを debug にする）
 */
async function executeAutoDelete(
  ticketId: string,
  channelId: string,
  guildId: string,
  client: Client,
  retryingHold: boolean,
): Promise<void> {
  try {
    const ticketRepository = getBotTicketRepository();

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket || ticket.status !== TICKET_STATUS.CLOSED) {
      logger.info(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.auto_delete_skipped_not_closed",
          { guildId, ticketId },
        ),
      );
      return;
    }

    const config = await getBotTicketSettingsService().findByGuildAndCategory(
      ticket.guildId,
      ticket.categoryId,
    );
    if (!config) {
      logger.info(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.auto_delete_held_config_missing",
          { guildId, ticketId, categoryId: ticket.categoryId },
        ),
      );
      return;
    }

    // 記録を消す前に、Bot がチャンネルを扱えて、消す権限（「チャンネルの管理」）もあるか確かめる。
    // どちらかが無ければ保留して、後で再試行する
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const access = guild
      ? await getTicketChannelAccess(
          guild,
          ticket.channelId,
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        )
      : null;
    if (!access || access.status === "inaccessible") {
      holdAutoDeleteAndRetry(
        ticketId,
        ticket.channelId,
        guildId,
        client,
        retryingHold,
      );
      return;
    }

    // DB からチケットを削除する。状態の確認と削除を1回で行い、上の確認から
    // ここまでの間に再オープンされていたら消さない
    const deleted = await ticketRepository.deleteIfClosed(ticket.id);
    if (!deleted) {
      logger.info(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.auto_delete_skipped_not_closed",
          { guildId, ticketId },
        ),
      );
      return;
    }

    // チャンネルを削除（既に無いと確定していれば記録の削除だけで終わる）
    if (access.status === "handleable") {
      await access.channel.delete().catch((error: unknown) => {
        logger.warn(
          logPrefixed(
            "system:log_prefix.ticket",
            "ticket:log.ticket_channel_delete_failed",
            { guildId, channelId: ticket.channelId },
          ),
          error,
        );
      });
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_auto_deleted",
        { guildId, channelId },
      ),
    );
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_auto_delete_failed",
        { guildId, channelId },
      ),
      error,
    );
  }
}

/**
 * Bot起動時に全ギルドのクローズ済みチケットの自動削除タイマーを復元する
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 */
export async function restoreAutoDeleteTimers(
  client: Client,
  ticketRepository: ITicketRepository,
): Promise<void> {
  let restoredCount = 0;
  for (const guildId of client.guilds.cache.keys()) {
    restoredCount += await restoreAutoDeleteTimersForGuild(
      guildId,
      client,
      ticketRepository,
    );
  }

  if (restoredCount > 0) {
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_restore",
        { count: String(restoredCount) },
      ),
    );
  }
}

/**
 * 1ギルド分のクローズ済みチケットの自動削除タイマーを組み直す
 * 起動時の復元、猶予内の再導入（退出時に止めたタイマーの再開）、再接続後の突き合わせ、
 * パネルの再設置で使う。既定では、既に予約があるチケットはそのままにする（再接続のたびに同じ予約を張り直さない）。
 * パネルの再設置では replaceExisting を立て、予約が残っているチケットも今の設定と closedAt から組み直す。
 * カテゴリの設定が無いチケットは予約しない（自動削除を止める）
 * @param guildId 対象ギルドID
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 * @param options categoryId で対象のカテゴリを絞り、replaceExisting で既存の予約も置き換える
 * @returns 予約した（置き換えたものを含む）タイマーの件数
 */
export async function restoreAutoDeleteTimersForGuild(
  guildId: string,
  client: Client,
  ticketRepository: ITicketRepository,
  options: RestoreAutoDeleteTimersOptions = {},
): Promise<number> {
  const { categoryId, replaceExisting = false } = options;
  const closedTickets = await ticketRepository
    .findAllClosedByGuild(guildId)
    .catch(() => []);

  let restoredCount = 0;
  for (const ticket of closedTickets) {
    if (categoryId !== undefined && ticket.categoryId !== categoryId) continue;
    if (!replaceExisting && jobScheduler.hasJob(toAutoDeleteJobId(ticket.id))) {
      continue;
    }

    const settingsService = getBotTicketSettingsService();
    const config = await settingsService
      .findByGuildAndCategory(ticket.guildId, ticket.categoryId)
      .catch(() => null);
    if (!config) continue;

    // 残り時間が0以下の場合は即時削除される（addOneTimeJob内でMath.max(0, delayMs)）
    const remainingMs = computeAutoDeleteRemainingMs(
      config.autoDeleteDays,
      ticket.elapsedDeleteMs,
      ticket.closedAt,
      Date.now(),
    );
    scheduleTicketAutoDelete(
      ticket.id,
      ticket.channelId,
      ticket.guildId,
      remainingMs,
      client,
      { replaceExisting },
    );
    restoredCount++;
  }
  return restoredCount;
}

/**
 * パネル（設定）を作り直したカテゴリの、クローズ済みチケットの自動削除を予約し直す
 * 設定が無い間は自動削除を止めている（発火しても削除せず、復元でも予約しない）ため、設定が戻ったときに再開する。
 * 予約が残っているチケット（設定が無い間にまだ発火していないもの）も、作り直した設定と closedAt から組み直して置き換える。
 * 残っている予約は作り直す前の設定の日数で計算されており、そのままにすると、途中で再起動したかどうかで消える時期が変わるため。
 * 設定が無かった間もクローズからの経過に含めるので、期限を過ぎているチケットはすぐに削除される。
 * 失敗してもログに残すだけで、パネルの設置は妨げない
 * @param guildId 対象ギルドID
 * @param categoryId パネルを作り直したカテゴリID
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function resumeAutoDeleteForCategory(
  guildId: string,
  categoryId: string,
  client: Client,
  ticketRepository: ITicketRepository,
): Promise<void> {
  try {
    const resumedCount = await restoreAutoDeleteTimersForGuild(
      guildId,
      client,
      ticketRepository,
      { categoryId, replaceExisting: true },
    );
    if (resumedCount > 0) {
      logger.info(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.auto_delete_resumed",
          { guildId, categoryId, count: String(resumedCount) },
        ),
      );
    }
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_resume_failed",
        { guildId, categoryId },
      ),
      error,
    );
  }
}
