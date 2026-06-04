// src/features/vc-auto-recruit/vcAutoRecruitSettingsDefaults.ts
// VC自動募集設定のデフォルト値・正規化ロジック

import type { VcAutoRecruitSettings } from "../../shared/database/types";

/** VC自動募集設定の初期値 */
export const DEFAULT_VC_AUTO_RECRUIT_SETTINGS: VcAutoRecruitSettings = {
  enabled: false,
  embedEnabled: true,
  enabledCategoryIds: [],
  activeInvites: [],
};

/**
 * VC自動募集設定の初期値を生成する
 * @returns デフォルト VcAutoRecruitSettings オブジェクト
 */
export function createDefaultVcAutoRecruitSettings(): VcAutoRecruitSettings {
  // 既定値から新しい設定オブジェクトを都度生成して返す（配列参照を共有しない）
  return {
    enabled: DEFAULT_VC_AUTO_RECRUIT_SETTINGS.enabled,
    embedEnabled: DEFAULT_VC_AUTO_RECRUIT_SETTINGS.embedEnabled,
    enabledCategoryIds: [],
    activeInvites: [],
  };
}

/**
 * VC自動募集設定を正規化し、配列参照を分離する
 * @param config 正規化対象の設定
 * @returns 配列を複製した設定オブジェクト
 */
export function normalizeVcAutoRecruitSettings(
  config: VcAutoRecruitSettings,
): VcAutoRecruitSettings {
  // 可変配列を複製して設定オブジェクトを正規化する
  return {
    enabled: config.enabled,
    channelId: config.channelId,
    message: config.message,
    embedEnabled: config.embedEnabled,
    enabledCategoryIds: [...config.enabledCategoryIds],
    activeInvites: [...config.activeInvites],
  };
}
