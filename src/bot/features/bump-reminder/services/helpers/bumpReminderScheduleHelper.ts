// src/bot/features/bump-reminder/services/helpers/bumpReminderScheduleHelper.ts
// bump-reminder のメモリスケジュール管理ヘルパー

import { jobScheduler } from "../../../../../shared/scheduler/jobScheduler";

export interface ScheduledReminderRef {
  jobId: string;
  reminderId: string;
}

/**
 * メモリ上の one-time リマインダーを登録する
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
      reminders.delete(reminderKey);
    }
  });

  reminders.set(reminderKey, { jobId, reminderId });
}

/**
 * リマインダーをスケジューラーとメモリ管理の双方から除去する
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
