// ギルドの Bump リマインダー予約の取り消し（パネルメッセージの片付けを含む）

import type { Client } from "discord.js";
import {
  getBotBumpReminderManager,
  getBotBumpReminderRepository,
} from "../../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import type { BumpReminder } from "../../repositories/types";
import { deleteBumpPanelMessage } from "./deleteBumpPanel";

/**
 * ギルドの Bump リマインダー予約をすべて取り消し、予約ごとのパネルメッセージも消す
 *
 * 予約を取り消すとリマインドは送られず、送信後にパネルを消す処理（sendBumpReminder）も走らない。
 * 次の Bump で前回のパネルを探す処理（deleteOldPanel）も pending の行しか見ないため、
 * ここで消さないと「<t:…:R>にリマインドが通知されます」のパネルがチャンネルに残り続ける。
 *
 * 機能の無効化・設定のリセット（コマンドとダッシュボードの両方）と、
 * 全設定リセット（purgeGuildDataUsecase。コマンドと Web API の両方）はこの関数を通す。
 * Bot の退出時（stopGuildJobsUsecase）はパネルを消せないため、manager の cancelAllForGuild を直接使う。
 *
 * 取り消しの時点でまだ登録されていない予約は拾えない。無効化の最中に検知した Bump の予約は、
 * 検知側（handleBumpDetected）が登録後に設定を読み直して取り消す。
 * @param client Discord クライアント（パネルの取得・削除に使う）
 * @param guildId 対象ギルドID
 * @returns 取り消した予約の件数
 */
export async function cancelGuildBumpReminders(
  client: Client,
  guildId: string,
): Promise<number> {
  // 取り消すと pending の行から外れてパネルを引けなくなるため、先にパネルの場所を控える
  const pendingReminders = await findPendingRemindersForPanelCleanup(guildId);

  // タイマーを先に止め、パネルを消している間にリマインドが発火しないようにする
  const cancelledCount =
    await getBotBumpReminderManager().cancelAllForGuild(guildId);

  await Promise.all(
    pendingReminders.map((reminder) =>
      deleteBumpPanelMessage(
        client,
        reminder.channelId,
        reminder.panelMessageId,
        guildId,
      ),
    ),
  );

  return cancelledCount;
}

/**
 * パネルを片付けるために、ギルドの pending 予約を取得する
 * 取得に失敗しても予約の取り消しは続けたいため、失敗時はログを残して空配列を返す
 * @param guildId 対象ギルドID
 * @returns pending 予約の一覧（取得失敗時は空配列）
 */
async function findPendingRemindersForPanelCleanup(
  guildId: string,
): Promise<BumpReminder[]> {
  try {
    // 設定サービスは pending 行を扱わないため、ランタイムデータのリポジトリを直接引く
    return await getBotBumpReminderRepository().findPendingByGuild(guildId);
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_panel_lookup_failed",
        { guildId },
      ),
      error,
    );
    return [];
  }
}
