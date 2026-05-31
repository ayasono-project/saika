// src/features/unverified-kick/unverifiedKickSettingsDefaults.ts
// 未承認ユーザー自動キック設定のデフォルト値・初期化ロジック

import type { UnverifiedKickSettings } from "../../shared/database/types";

/** 猶予日数のデフォルト */
export const DEFAULT_UNVERIFIED_KICK_GRACE_DAYS = 7;

/** 猶予日数（graceDays）の許容範囲（濫用対策で 1〜30） */
export const UNVERIFIED_KICK_GRACE_MIN_DAYS = 1;
export const UNVERIFIED_KICK_GRACE_MAX_DAYS = 30;

/** 警告日数（warnDays）の下限（上限は graceDays - 1 で動的） */
export const UNVERIFIED_KICK_WARN_MIN_DAYS = 1;

/** カスタム DM の最大文字数 */
export const UNVERIFIED_KICK_DM_MAX_LENGTH = 500;

/** 未承認ユーザー自動キック設定の初期値 */
export const DEFAULT_UNVERIFIED_KICK_SETTINGS: UnverifiedKickSettings = {
  enabled: false,
  graceDays: DEFAULT_UNVERIFIED_KICK_GRACE_DAYS,
  exemptRoleIds: [],
};

/**
 * 未承認ユーザー自動キック設定の初期値を生成する
 * @returns デフォルト UnverifiedKickSettings オブジェクト
 */
export function createDefaultUnverifiedKickSettings(): UnverifiedKickSettings {
  // 配列は参照を共有しないよう都度生成する
  return {
    ...DEFAULT_UNVERIFIED_KICK_SETTINGS,
    exemptRoleIds: [],
  };
}
