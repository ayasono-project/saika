// src/shared/features/member-log/memberLogSettingsDefaults.ts
// メンバーログ設定のデフォルト値・初期化ロジック

import type { MemberLogSettings } from "../../shared/database/types";

/** メンバーログ設定の初期値 */
export const DEFAULT_MEMBER_LOG_SETTINGS: MemberLogSettings = {
  enabled: false,
};

/**
 * メンバーログ設定の初期値を生成する
 * @returns デフォルト MemberLogSettings オブジェクト
 */
export function createDefaultMemberLogSettings(): MemberLogSettings {
  // 既定値から新しい設定オブジェクトを都度生成して返す
  return { ...DEFAULT_MEMBER_LOG_SETTINGS };
}
