// src/shared/features/bump-reminder/bumpReminderConfigDefaults.ts
// Bumpリマインダー設定のデフォルト値・正規化ロジック

import type { BumpReminderConfig } from "../../database/types";

/** Bumpリマインダー設定の初期値 */
export const DEFAULT_BUMP_REMINDER_CONFIG: BumpReminderConfig = {
  enabled: true,
  mentionUserIds: [],
};

/**
 * Bumpリマインダー設定を正規化し、配列参照を分離する
 */
export function normalizeBumpReminderConfig(
  config: BumpReminderConfig,
): BumpReminderConfig {
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
 * normalizeBumpReminderConfig で mentionUserIds 配列を複製して返す
 */
export function createDefaultBumpReminderConfig(): BumpReminderConfig {
  return normalizeBumpReminderConfig(DEFAULT_BUMP_REMINDER_CONFIG);
}
