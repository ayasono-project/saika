// src/features/inactive-kick/inactiveKickSettingsDefaults.ts
// 非アクティブ自動キック設定のデフォルト値・初期化ロジック

import type { InactiveKickSettings } from "../../shared/database/types";

/** 非アクティブ判定日数のデフォルト */
export const DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS = 30;

/** しきい値（非アクティブ判定日数）の許容範囲 */
export const INACTIVE_KICK_THRESHOLD_MIN_DAYS = 14;
export const INACTIVE_KICK_THRESHOLD_MAX_DAYS = 365;

/** カスタムメッセージの最大文字数 */
export const INACTIVE_KICK_MESSAGE_MAX_LENGTH = 500;

/** 非アクティブ自動キック設定の初期値 */
export const DEFAULT_INACTIVE_KICK_SETTINGS: InactiveKickSettings = {
  enabled: false,
  thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
  whitelistRoleIds: [],
  whitelistUserIds: [],
};

/**
 * 非アクティブ自動キック設定の初期値を生成する
 * @returns デフォルト InactiveKickSettings オブジェクト
 */
export function createDefaultInactiveKickSettings(): InactiveKickSettings {
  // 配列は参照を共有しないよう都度生成する
  return {
    ...DEFAULT_INACTIVE_KICK_SETTINGS,
    whitelistRoleIds: [],
    whitelistUserIds: [],
  };
}
