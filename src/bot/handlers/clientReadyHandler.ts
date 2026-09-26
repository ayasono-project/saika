// clientReady 時のBot共通ハンドラー

import { Events } from "discord.js";
import { restoreBumpRemindersOnStartup } from "../../features/bump-reminder/handlers/bumpReminderStartup";
import { initGuildInviteCache } from "../../features/member-log/handlers/inviteTracker";
import { syncTicketsOnStartup } from "../../features/ticket/services/ticketChannelSync";
import {
  resolveUnverifiedKickSchedule,
  runUnverifiedKickDailyCheck,
  UNVERIFIED_KICK_JOB_ID,
} from "../../features/unverified-kick/services/unverifiedKickRunner";
import { cleanupVacOnStartup } from "../../features/vac/handlers/vacStartupCleanup";
import { cleanupVcAutoRecruitOnStartup } from "../../features/vc-auto-recruit/handlers/vcAutoRecruitStartupCleanup";
import { logPrefixed } from "../../shared/locale/localeManager";
import { jobScheduler } from "../../shared/scheduler/jobScheduler";
import { logger } from "../../shared/utils/logger";
import type { BotClient } from "../client";
import { getBotTicketRepository } from "../services/botCompositionRoot";
import { applyBotPresence } from "../services/botPresence";
import {
  registerGuildDeletionJob,
  runGuildDeletionSweep,
} from "../services/guildDeletionSweep";

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

    // ギルド登録を参加状況と照合する（親行の補完・削除予約の取り消しと追加・猶予切れの
    // 削除）。Bot の停止中に起きた参加・退出は guildCreate / guildDelete が飛ばないため
    // ここで拾う。以降の復元処理が guild 単位のデータを書くので、それらより前に行う。
    // 以後は日次ジョブで同じ照合を繰り返す
    await runGuildDeletionSweep(client);
    registerGuildDeletionJob(client);
    // 再 IDENTIFY の後（ShardReady）にも照合する。切断中に起きた導入・退出では
    // guildCreate / guildDelete が飛ばず（導入は guildAvailable になる）、日次ジョブを
    // 待つと新しいギルドが最長24時間設定を保存できないため。RESUME ではイベントが
    // 再送されるので不要。照合は冪等なので日次ジョブと重なっても安全で、例外も
    // 内部で握るため待たずに投げる
    client.on(Events.ShardReady, () => {
      void runGuildDeletionSweep(client);
    });

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
    // 停止中に消されたチャンネルのチケットを片付けてから、クローズ済みチケットの自動削除タイマーを復元
    await syncTicketsOnStartup(client, getBotTicketRepository());

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
