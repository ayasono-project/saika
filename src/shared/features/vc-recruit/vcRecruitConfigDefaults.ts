// src/shared/features/vc-recruit/vcRecruitConfigDefaults.ts
// VC募集設定のデフォルト値・正規化ロジック

import type { VcRecruitConfig } from "../../database/types";

/** VC募集設定の初期値 */
export const DEFAULT_VC_RECRUIT_CONFIG: VcRecruitConfig = {
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
export function createDefaultVcRecruitConfig(): VcRecruitConfig {
  return {
    enabled: DEFAULT_VC_RECRUIT_CONFIG.enabled,
    mentionRoleIds: [],
    setups: [],
  };
}

/**
 * VC募集設定を正規化し、配列参照を分離する
 */
export function normalizeVcRecruitConfig(
  config: VcRecruitConfig,
): VcRecruitConfig {
  return {
    enabled: config.enabled,
    mentionRoleIds: [...config.mentionRoleIds],
    setups: config.setups.map((s) => ({
      ...s,
      createdVoiceChannelIds: [...s.createdVoiceChannelIds],
    })),
  };
}
