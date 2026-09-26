// bump-reminder 復元時の pending 正規化ヘルパー

import {
  isBumpServiceName,
  toBumpReminderKey,
} from "../../constants/bumpReminderConstants";
import type { BumpReminder } from "../../repositories/types";

/** 復元計画（管理キーごとの最新1件と、取り消す古い行） */
export interface BumpReminderRestorePlan {
  latestByGuild: Map<string, BumpReminder>;
  staleReminders: BumpReminder[];
}

/**
 * 同一 guild + serviceName の pending を最新1件へ正規化する計画を作成する
 * キー = 「guildId:serviceName」（有効な serviceName の場合）、または「guildId」（存在しない・無効な場合）
 * restore usecase とキー生成ルールを揃えるため、isBumpServiceName で検証する
 * @param pendingReminders DB の pending リマインダー一覧
 * @returns 復元計画
 */
export function createBumpReminderRestorePlan(
  pendingReminders: BumpReminder[],
): BumpReminderRestorePlan {
  const latestByGuild = new Map<string, BumpReminder>();
  const staleReminders: BumpReminder[] = [];

  for (const reminder of pendingReminders) {
    // 無効な serviceName は undefined 扱い（restore usecase と揃えてキー生成）
    const resolvedServiceName =
      reminder.serviceName && isBumpServiceName(reminder.serviceName)
        ? reminder.serviceName
        : undefined;
    const key = toBumpReminderKey(reminder.guildId, resolvedServiceName);
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
