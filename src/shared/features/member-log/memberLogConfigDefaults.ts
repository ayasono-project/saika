// src/shared/features/member-log/memberLogConfigDefaults.ts
// メンバーログ設定のデフォルト値・初期化ロジック

import type { MemberLogConfig } from "../../database/types";

/** メンバーログ設定の初期値 */
export const DEFAULT_MEMBER_LOG_CONFIG: MemberLogConfig = {
  enabled: false,
};

/**
 * メンバーログ設定の初期値を生成する
 * @returns デフォルト MemberLogConfig オブジェクト
 */
export function createDefaultMemberLogConfig(): MemberLogConfig {
  // 既定値から新しい設定オブジェクトを都度生成して返す
  return { ...DEFAULT_MEMBER_LOG_CONFIG };
}
