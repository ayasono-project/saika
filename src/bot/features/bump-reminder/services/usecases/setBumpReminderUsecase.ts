// src/bot/features/bump-reminder/services/usecases/setBumpReminderUsecase.ts
// Bumpリマインダー設定のユースケース

import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  type BumpServiceName,
  toBumpReminderJobId,
  toBumpReminderKey,
  toScheduledAt,
} from "../../constants/bumpReminderConstants";
import { type IBumpReminderRepository } from "../../repositories/types";
import {
  type ScheduledReminderRef,
  scheduleReminderInMemory,
} from "../helpers/bumpReminderScheduleHelper";
import { createTrackedReminderTask } from "../helpers/bumpReminderTrackedTask";

type SetBumpReminderUsecaseInput = {
  repository: IBumpReminderRepository;
  reminders: Map<string, ScheduledReminderRef>;
  guildId: string;
  channelId: string;
  messageId: string | undefined;
  panelMessageId: string | undefined;
  delayMinutes: number;
  task: () => Promise<void>;
  serviceName?: BumpServiceName;
  cancelReminder: (
    guildId: string,
    serviceName?: BumpServiceName,
  ) => Promise<boolean>;
};

/**
 * リマインダーを設定（DBに保存 + スケジュール登録）する
 * @param input ユースケース入力
 * @returns 実行完了を示す Promise
 */
export async function setBumpReminderUsecase(
  input: SetBumpReminderUsecaseInput,
): Promise<void> {
  const {
    repository,
    reminders,
    guildId,
    channelId,
    messageId,
    panelMessageId,
    delayMinutes,
    task,
    serviceName,
    cancelReminder,
  } = input;

  const reminderKey = toBumpReminderKey(guildId, serviceName);
  const jobId = toBumpReminderJobId(guildId, serviceName);

  if (reminders.has(reminderKey)) {
    logger.info(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_cancelling",
        { guildId },
      ),
    );
    await cancelReminder(guildId, serviceName);
  }

  const scheduledAt = toScheduledAt(delayMinutes);
  const reminder = await repository.create(
    guildId,
    channelId,
    scheduledAt,
    messageId,
    panelMessageId,
    serviceName,
  );

  const delayMs = scheduledAt.getTime() - Date.now();
  scheduleReminderInMemory(
    reminders,
    reminderKey,
    jobId,
    reminder.id,
    delayMs,
    createTrackedReminderTask(repository, guildId, reminder.id, task),
  );

  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.scheduler_scheduled",
      {
        guildId,
        minutes: delayMinutes,
      },
    ),
  );
}
