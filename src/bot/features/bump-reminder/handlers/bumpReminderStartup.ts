// src/bot/features/bump-reminder/handlers/bumpReminderStartup.ts
// Bump リマインダーの起動時復元処理

import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import type { BotClient } from "../../../client";
import {
  getBotBumpReminderConfigService,
  getBotBumpReminderManager,
} from "../../../services/botCompositionRoot";
import { type BumpServiceName } from "../constants/bumpReminderConstants";
import { type BumpReminderTaskFactory } from "../services/bumpReminderService";
import { sendBumpReminder } from "./usecases/sendBumpReminder";

/**
 * 起動時に未実行の Bump リマインダーを復元する関数
 * @param client 起動済みの Bot クライアント
 * @returns 復元処理完了を示す Promise
 */
export async function restoreBumpRemindersOnStartup(
  client: BotClient,
): Promise<void> {
  try {
    // 復元処理で使用する依存サービスを取得
    const bumpReminderConfigService = getBotBumpReminderConfigService();
    const bumpReminderManager = getBotBumpReminderManager();

    // 永続化されたジョブ情報を実行可能タスクへ変換するファクトリ
    const taskFactory: BumpReminderTaskFactory = (
      guildId: string,
      channelId: string,
      messageId?: string,
      panelMessageId?: string,
      serviceName?: BumpServiceName,
    ) => {
      // 復元後の実行時に必要な引数を閉じ込めたクロージャを返す
      return () =>
        sendBumpReminder(
          client,
          guildId,
          channelId,
          messageId,
          serviceName,
          bumpReminderConfigService,
          panelMessageId,
        );
    };

    // pending 状態のレコードを読み込み、スケジューラへ再登録
    // （戻り値件数は現時点ではログ用途で未使用）
    await bumpReminderManager.restorePendingReminders(taskFactory);
  } catch (error) {
    // 復元失敗でも Bot 起動は継続し、障害調査用ログのみ残す
    logger.error(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_restore_failed",
      ),
      error,
    );
  }
}
