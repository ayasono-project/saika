// src/shared/features/bump-reminder/bumpReminderSettingsDefaults.ts
// Bumpリマインダー設定のデフォルト値・正規化ロジック

import type { BumpReminderSettings } from "../../shared/database/types";

/** Bumpリマインダー設定の初期値 */
export const DEFAULT_BUMP_REMINDER_SETTINGS: BumpReminderSettings = {
  enabled: true,
  mentionUserIds: [],
};

/**
 * Bumpリマインダー設定を正規化し、配列参照を分離する
 */
export function normalizeBumpReminderSettings(
  config: BumpReminderSettings,
): BumpReminderSettings {
  // 配列を複製して呼び出し元との参照共有を防ぐ
  return {
    enabled: config.enabled,
    channelId: config.channelId,
    mentionRoleId: config.mentionRoleId,
    mentionUserIds: [...config.mentionUserIds],
  };
}

/**
 * Bumpリマインダー設定の初期値を生成する
 * normalizeBumpReminderSettings で mentionUserIds 配列を複製して返す
 */
export function createDefaultBumpReminderSettings(): BumpReminderSettings {
  return normalizeBumpReminderSettings(DEFAULT_BUMP_REMINDER_SETTINGS);
}
