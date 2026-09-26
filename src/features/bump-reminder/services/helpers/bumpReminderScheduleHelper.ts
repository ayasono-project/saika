// bump-reminder のメモリスケジュール管理ヘルパー

import { jobScheduler } from "../../../../shared/scheduler/jobScheduler";

/** メモリ上で追跡する予約1件（スケジューラーのジョブIDと DB の行ID） */
export interface ScheduledReminderRef {
  jobId: string;
  reminderId: string;
}

/**
 * メモリ上の one-time リマインダーを登録する
 * @param reminders 予約を追跡する管理マップ
 * @param reminderKey 管理キー（toBumpReminderKey で作ったもの）
 * @param jobId スケジューラーのジョブID
 * @param reminderId DB 上のリマインダーID
 * @param delayMs 実行までの遅延（ミリ秒）
 * @param task 予定時刻に実行するタスク
 */
export function scheduleReminderInMemory(
  reminders: Map<string, ScheduledReminderRef>,
  reminderKey: string,
  jobId: string,
  reminderId: string,
  delayMs: number,
  task: () => Promise<void>,
): void {
  // スケジューラー実行後は管理マップから除去してリークを防ぐ
  jobScheduler.addOneTimeJob(jobId, delayMs, async () => {
    try {
      await task();
    } finally {
      // 実行中に同じキーへ次の予約が入っていたら、そのエントリは消さない
      // （消すとタイマーと DB の pending 行が生きたまま管理から外れ、取り消せなくなる）
      if (reminders.get(reminderKey)?.reminderId === reminderId) {
        reminders.delete(reminderKey);
      }
    }
  });

  reminders.set(reminderKey, { jobId, reminderId });
}

/**
 * リマインダーをスケジューラーとメモリ管理の双方から除去する
 * @param reminders 予約を追跡する管理マップ
 * @param reminderKey 除去する予約の管理キー
 * @returns 除去した予約（該当が無ければ undefined）
 */
export function cancelScheduledReminder(
  reminders: Map<string, ScheduledReminderRef>,
  reminderKey: string,
): ScheduledReminderRef | undefined {
  const reminder = reminders.get(reminderKey);
  if (!reminder) {
    return undefined;
  }

  jobScheduler.removeJob(reminder.jobId);
  reminders.delete(reminderKey);
  return reminder;
}
