// src/bot/features/bump-reminder/services/helpers/bumpReminderRestorePlanner.ts
// bump-reminder 復元時の pending 正規化ヘルパー

import { isBumpServiceName } from "../../constants/bumpReminderConstants";
import type { BumpReminder } from "../../repositories/types";

export interface BumpReminderRestorePlan {
  latestByGuild: Map<string, BumpReminder>;
  staleReminders: BumpReminder[];
}

/**
 * 同一 guild + serviceName の pending を最新1件へ正規化する計画を作成する
 * キー = 「guildId:serviceName」（有効な serviceName の場合）、または「guildId」（存在しない・無効な場合）
 * restore usecase とキー生成ルールを届けるため、isBumpServiceName で検証する
 */
export function createBumpReminderRestorePlan(
  pendingReminders: BumpReminder[],
): BumpReminderRestorePlan {
  const latestByGuild = new Map<string, BumpReminder>();
  const staleReminders: BumpReminder[] = [];

  for (const reminder of pendingReminders) {
    // 無効な serviceName は undefined 扱い（restore usecase と届けてキー生成）
    const resolvedServiceName =
      reminder.serviceName && isBumpServiceName(reminder.serviceName)
        ? reminder.serviceName
        : undefined;
    const key = resolvedServiceName
      ? `${reminder.guildId}:${resolvedServiceName}`
      : reminder.guildId;
    const existing = latestByGuild.get(key);
    if (!existing || reminder.scheduledAt > existing.scheduledAt) {
      if (existing) {
        staleReminders.push(existing);
      }
      latestByGuild.set(key, reminder);
    } else {
      staleReminders.push(reminder);
    }
  }

  return { latestByGuild, staleReminders };
}
