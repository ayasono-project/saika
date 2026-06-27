// src/bot/handlers/clientReadyHandler.ts
// clientReady 時のBot共通ハンドラー

import { ActivityType, Events, PresenceUpdateStatus } from "discord.js";
import { restoreBumpRemindersOnStartup } from "../../features/bump-reminder/handlers/bumpReminderStartup";
import {
  INACTIVE_KICK_JOB_ID,
  resolveInactiveKickSchedule,
  runInactiveKickDailyCheck,
} from "../../features/inactive-kick/services/inactiveKickRunner";
import { initGuildInviteCache } from "../../features/member-log/handlers/inviteTracker";
import { restoreAutoDeleteTimers } from "../../features/ticket/services/ticketAutoDeleteService";
import {
  resolveUnverifiedKickSchedule,
  runUnverifiedKickDailyCheck,
  UNVERIFIED_KICK_JOB_ID,
} from "../../features/unverified-kick/services/unverifiedKickRunner";
import { cleanupVacOnStartup } from "../../features/vac/handlers/vacStartupCleanup";
import { cleanupVcAutoRecruitOnStartup } from "../../features/vc-auto-recruit/handlers/vcAutoRecruitStartupCleanup";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { jobScheduler } from "../../shared/scheduler/jobScheduler";
import { logger } from "../../shared/utils/logger";
import type { BotClient } from "../client";
import { getBotTicketRepository } from "../services/botCompositionRoot";

/**
 * 現在の稼働サーバー数を反映した「プレイ中」プレゼンスを適用する。
 * 初回 ready だけでなく再接続（shardReady / shardResume）後にも呼び、
 * 再 IDENTIFY でアクティビティが失われたまま復元されない問題を防ぐ。
 */
function applyBotPresence(client: BotClient): void {
  const serverCount = client.guilds.cache.size;
  client.user?.setPresence({
    activities: [
      {
        name: tDefault("system:bot.presence_activity", {
          count: serverCount,
        }),
        type: ActivityType.Playing,
      },
    ],
    status: PresenceUpdateStatus.Online,
  });
}

/**
 * clientReady 発火時の初期化後処理をまとめて実行する関数
 */
export async function handleClientReady(client: BotClient): Promise<void> {
  try {
    // 起動直後の基本メトリクスをログ出力
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.bot_ready", {
        tag: client.user?.username,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.servers", {
        count: client.guilds.cache.size,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.users", {
        count: client.users.cache.size,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.commands", {
        count: client.commands.size,
      }),
    );

    // 稼働中サーバー数をプレゼンス文言へ反映
    applyBotPresence(client);
    // 再接続（新規セッションの再 IDENTIFY）/ 再開後はアクティビティが
    // クリアされ once:clientReady では復元されないため、その都度再適用する。
    // clientReady は once なので本リスナー登録も一度だけ行われる。
    client.on(Events.ShardReady, () => applyBotPresence(client));
    client.on(Events.ShardResume, () => applyBotPresence(client));

    // 全サーバーの招待リンクをキャッシュ（メンバーログの招待追跡に使用）
    await Promise.all(
      client.guilds.cache.map((guild) => initGuildInviteCache(guild)),
    );

    // 起動時復元・クリーンアップを順に実行
    await restoreBumpRemindersOnStartup(client);
    // Bump 復元後に VAC 掃除を行い、起動後の状態を最終整合
    await cleanupVacOnStartup(client);
    // 空・不在 VC の募集投稿を募集終了へ差し替えて追跡を整理
    await cleanupVcAutoRecruitOnStartup(client);
    // クローズ済みチケットの自動削除タイマーを復元
    await restoreAutoDeleteTimers(client, getBotTicketRepository());

    // 非アクティブ自動キックのスイープを登録（毎時・per-guild timezone/runHour で絞り込み）
    // INACTIVE_KICK_CRON が設定されていれば検証用にスケジュールを上書きする
    jobScheduler.addJob({
      id: INACTIVE_KICK_JOB_ID,
      schedule: resolveInactiveKickSchedule(),
      noOverlap: true,
      task: () => runInactiveKickDailyCheck(client),
    });

    // 未承認ユーザー自動キックのスイープを登録（毎時・per-guild timezone/runHour で絞り込み）
    // UNVERIFIED_KICK_CRON が設定されていれば検証用にスケジュールを上書きする
    jobScheduler.addJob({
      id: UNVERIFIED_KICK_JOB_ID,
      schedule: resolveUnverifiedKickSchedule(),
      noOverlap: true,
      task: () => runUnverifiedKickDailyCheck(client),
    });
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ready",
        "system:ready.startup_init_failed",
      ),
      error,
    );
  }
}
