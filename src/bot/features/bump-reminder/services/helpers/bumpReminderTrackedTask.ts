// src/bot/features/bump-reminder/services/helpers/bumpReminderTrackedTask.ts
// Bumpリマインダータスクの実行結果をDBステータスへ反映するヘルパー

import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import { BUMP_REMINDER_STATUS } from "../../constants/bumpReminderConstants";
import { type IBumpReminderRepository } from "../../repositories/types";

/**
 * タスク実行後に DB ステータスを更新するラッパーを生成する
 * 成功時は sent、失敗時は cancelled に更新する
 * @param repository リマインダー永続化リポジトリ
 * @param guildId ログ出力に利用するギルドID
 * @param reminderId 更新対象のリマインダーID
 * @param task 実行対象タスク
 * @returns ステータス更新付きの実行関数
 */
export function createTrackedReminderTask(
  repository: IBumpReminderRepository,
  guildId: string,
  reminderId: string,
  task: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    try {
      await task();
      await repository.updateStatus(reminderId, BUMP_REMINDER_STATUS.SENT);
    } catch (error) {
      logger.error(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_task_failed",
          {
            guildId,
          },
        ),
        error,
      );

      try {
        await repository.updateStatus(
          reminderId,
          BUMP_REMINDER_STATUS.CANCELLED,
        );
      } catch (statusError) {
        logger.error(
          logPrefixed(
            "system:log_prefix.bump_reminder",
            "bumpReminder:log.scheduler_task_failed",
            {
              guildId,
            },
          ),
          statusError,
        );
      }
    }
  };
}
