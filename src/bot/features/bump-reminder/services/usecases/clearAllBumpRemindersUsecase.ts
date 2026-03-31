// src/bot/features/bump-reminder/services/usecases/clearAllBumpRemindersUsecase.ts
// 全Bumpリマインダーのクリアユースケース

import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import { type ScheduledReminderRef } from "../helpers/bumpReminderScheduleHelper";

type ClearAllBumpRemindersUsecaseInput = {
  reminders: Map<string, ScheduledReminderRef>;
  /** Map の生のキー（複合キーの可能性あり）を受け取りキャンセル処理を実行する */
  cancelByKey: (reminderKey: string) => Promise<boolean>;
};

/**
 * すべてのリマインダーをクリアする
 * @param input ユースケース入力
 * @returns 実行完了を示す Promise
 */
export async function clearAllBumpRemindersUsecase(
  input: ClearAllBumpRemindersUsecaseInput,
): Promise<void> {
  const { reminders, cancelByKey } = input;

  const reminderKeys = Array.from(reminders.keys());
  const results = await Promise.allSettled(
    reminderKeys.map((key) => cancelByKey(key)),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_task_failed",
          {
            guildId: reminderKeys[index],
          },
        ),
        result.reason,
      );
    }
  });
}
