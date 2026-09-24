// ギルド登録の照合と猶予切れデータの削除スイープ（起動時 + 日次ジョブの配線）

import type { Client } from "discord.js";
import {
  GUILD_DELETION_JOB_ID,
  GUILD_DELETION_JOB_SCHEDULE,
  GUILD_DELETION_JOB_TIMEZONE,
  JOINED_GUILDS_PAGE_LIMIT,
} from "../../features/guild-settings/constants/guildSettings.constants";
import { reconcileGuildsUsecase } from "../../features/guild-settings/usecases/reconcileGuildsUsecase";
import { logPrefixed } from "../../shared/locale/localeManager";
import { jobScheduler } from "../../shared/scheduler/jobScheduler";
import { logger } from "../../shared/utils/logger";
import {
  getBotBumpReminderManager,
  getBotGuildRegistryRepository,
  getBotTicketRepository,
} from "./botCompositionRoot";

const LOG_PREFIX = "system:log_prefix.guild_deletion";

/**
 * Bot がいま参加しているギルドの ID を Discord の REST API から取得する
 *
 * **ゲートウェイのキャッシュは使わない。** discord.js は再 IDENTIFY 後の READY で
 * 消えたギルドをキャッシュから取り除かないため、切断中に外されたギルドが参加中に
 * 見え続け、再起動するまで削除予約が入らなくなる（discord.js 14.27.0 で確認）。
 * @param client Discord クライアント
 * @returns 参加中のギルド ID（全ページ分）
 */
async function fetchJoinedGuildIds(client: Client): Promise<string[]> {
  const guildIds: string[] = [];
  let after: string | undefined;
  // ID 昇順で返るので、最後の ID を次ページの起点にする。満杯でなければ最終ページ
  for (;;) {
    const page = await client.guilds.fetch(
      after
        ? { limit: JOINED_GUILDS_PAGE_LIMIT, after }
        : { limit: JOINED_GUILDS_PAGE_LIMIT },
    );
    guildIds.push(...page.keys());
    after = page.lastKey();
    if (page.size < JOINED_GUILDS_PAGE_LIMIT || !after) return guildIds;
  }
}

/**
 * ギルド登録を参加状況と照合し、猶予切れギルドのデータを削除する（1回分）
 *
 * 起動時（Bot 停止中に起きた参加・退出・期限切れを拾う）・再 IDENTIFY の後（切断中に
 * 起きた参加・退出を拾う）・日次ジョブの3経路から呼ぶ。
 * 例外は呼び出し元へ伝播させず、ログのみ残して Bot の稼働を止めない。
 * @param client 参加中のギルドを REST で取得するための Discord クライアント
 * @param now 期限判定と予約の起点に使う現在時刻
 * @returns 実行完了を示す Promise
 */
export async function runGuildDeletionSweep(
  client: Client,
  now: Date = new Date(),
): Promise<void> {
  try {
    const { cancelledCount, scheduledCount, purgedCount } =
      await reconcileGuildsUsecase(
        {
          guildRegistryRepository: getBotGuildRegistryRepository(),
          ticketRepository: getBotTicketRepository(),
          bumpReminderManager: getBotBumpReminderManager(),
        },
        await fetchJoinedGuildIds(client),
        now,
      );

    // 何も変わらないのが平常なので debug に留め、変化があったときだけ info で残す
    if (cancelledCount + scheduledCount + purgedCount === 0) {
      logger.debug(logPrefixed(LOG_PREFIX, "system:guild_deletion.no_target"));
      return;
    }
    if (cancelledCount > 0) {
      logger.info(
        logPrefixed(LOG_PREFIX, "system:guild_deletion.schedule_cancelled", {
          count: cancelledCount,
        }),
      );
    }
    if (scheduledCount > 0) {
      logger.info(
        logPrefixed(LOG_PREFIX, "system:guild_deletion.schedule_added", {
          count: scheduledCount,
        }),
      );
    }
    if (purgedCount > 0) {
      logger.info(
        logPrefixed(LOG_PREFIX, "system:guild_deletion.purged", {
          count: purgedCount,
        }),
      );
    }
  } catch (error) {
    logger.error(
      logPrefixed(LOG_PREFIX, "system:guild_deletion.sweep_failed"),
      error,
    );
  }
}

/**
 * ギルド登録の照合と猶予切れギルドの削除を行う日次ジョブを登録する
 * @param client 参加中のギルドを知るための Discord クライアント
 */
export function registerGuildDeletionJob(client: Client): void {
  jobScheduler.addJob({
    id: GUILD_DELETION_JOB_ID,
    schedule: GUILD_DELETION_JOB_SCHEDULE,
    timezone: GUILD_DELETION_JOB_TIMEZONE,
    noOverlap: true,
    task: () => runGuildDeletionSweep(client),
  });
}
