// src/bot/features/bump-reminder/services/usecases/restorePendingBumpRemindersUsecase.ts
// pending Bumpリマインダー復元のユースケース

import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  BUMP_REMINDER_STATUS,
  isBumpServiceName,
  toBumpReminderJobId,
  toBumpReminderKey,
} from "../../constants/bumpReminderConstants";
import { type IBumpReminderRepository } from "../../repositories/types";
import { type BumpReminderTaskFactory } from "../bumpReminderService";
import { createBumpReminderRestorePlan } from "../helpers/bumpReminderRestorePlanner";
import {
  type ScheduledReminderRef,
  scheduleReminderInMemory,
} from "../helpers/bumpReminderScheduleHelper";
import { createTrackedReminderTask } from "../helpers/bumpReminderTrackedTask";

type RestorePendingBumpRemindersUsecaseInput = {
  repository: IBumpReminderRepository;
  reminders: Map<string, ScheduledReminderRef>;
  taskFactory: BumpReminderTaskFactory;
};

/**
 * 起動時に DB の pending リマインダーを復元する
 * @param input ユースケース入力
 * @returns 復元件数
 */
export async function restorePendingBumpRemindersUsecase(
  input: RestorePendingBumpRemindersUsecaseInput,
): Promise<number> {
  const { repository, reminders, taskFactory } = input;
  const pendingReminders = await repository.findAllPending();
  let restoredCount = 0;

  const restorePlan = createBumpReminderRestorePlan(pendingReminders);

  await Promise.allSettled(
    restorePlan.staleReminders.map((reminder) =>
      repository.updateStatus(reminder.id, BUMP_REMINDER_STATUS.CANCELLED),
    ),
  );

  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      restorePlan.staleReminders.length > 0
        ? "bumpReminder:log.scheduler_duplicates_cancelled"
        : "bumpReminder:log.scheduler_duplicates_none",
      { count: restorePlan.staleReminders.length },
    ),
  );

  for (const reminder of restorePlan.latestByGuild.values()) {
    const now = new Date();
    const serviceName =
      reminder.serviceName && isBumpServiceName(reminder.serviceName)
        ? reminder.serviceName
        : undefined;

    const task = taskFactory(
      reminder.guildId,
      reminder.channelId,
      reminder.messageId || undefined,
      reminder.panelMessageId || undefined,
      serviceName,
    );

    if (reminder.scheduledAt <= now) {
      logger.info(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_executing_immediately",
          {
            guildId: reminder.guildId,
          },
        ),
      );
      await createTrackedReminderTask(
        repository,
        reminder.guildId,
        reminder.id,
        task,
      )();
      restoredCount++;
      continue;
    }

    const delayMs = reminder.scheduledAt.getTime() - now.getTime();
    const jobId = toBumpReminderJobId(reminder.guildId, serviceName);
    const reminderKey = toBumpReminderKey(reminder.guildId, serviceName);
    scheduleReminderInMemory(
      reminders,
      reminderKey,
      jobId,
      reminder.id,
      delayMs,
      createTrackedReminderTask(
        repository,
        reminder.guildId,
        reminder.id,
        task,
      ),
    );
    restoredCount++;
  }

  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      restoredCount > 0
        ? "bumpReminder:log.scheduler_restored"
        : "bumpReminder:log.scheduler_restored_none",
      { count: restoredCount },
    ),
  );

  return restoredCount;
}
