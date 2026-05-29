// src/shared/features/vc-recruit/vcRecruitSettingsDefaults.ts
// VC募集設定のデフォルト値・正規化ロジック

import type { VcRecruitSettings } from "../../shared/database/types";

/** VC募集設定の初期値 */
export const DEFAULT_VC_RECRUIT_SETTINGS: VcRecruitSettings = {
  enabled: true,
  mentionRoleIds: [],
  setups: [],
};

/** セットアップのデフォルトスレッドアーカイブ時間（24h） */
export const DEFAULT_THREAD_ARCHIVE_DURATION = 1440 as const;

/** メンションロール登録の上限数（Discord セレクトメニューの上限に準拠） */
export const MAX_MENTION_ROLES = 25;

/**
 * VC募集設定の初期値を生成する
 */
export function createDefaultVcRecruitSettings(): VcRecruitSettings {
  return {
    enabled: DEFAULT_VC_RECRUIT_SETTINGS.enabled,
    mentionRoleIds: [],
    setups: [],
  };
}

/**
 * VC募集設定を正規化し、配列参照を分離する
 */
export function normalizeVcRecruitSettings(
  config: VcRecruitSettings,
): VcRecruitSettings {
  return {
    enabled: config.enabled,
    mentionRoleIds: [...config.mentionRoleIds],
    setups: config.setups.map((s) => ({
      ...s,
      createdVoiceChannelIds: [...s.createdVoiceChannelIds],
    })),
  };
}
