// src/shared/features/vac/vacConfigDefaults.ts
// VAC設定のデフォルト値・正規化ロジック

import type { VacConfig } from "../../database/types";

/** VAC設定の初期値 */
export const DEFAULT_VAC_CONFIG: VacConfig = {
  enabled: false,
  triggerChannelIds: [],
  createdChannels: [],
};

/**
 * VAC設定の初期値を生成する
 */
export function createDefaultVacConfig(): VacConfig {
  // 既定値をもとに空配列を持つ新規設定を生成する
  return {
    enabled: DEFAULT_VAC_CONFIG.enabled,
    triggerChannelIds: [],
    createdChannels: [],
  };
}

/**
 * VAC設定を正規化し、配列参照を分離する
 */
export function normalizeVacConfig(config: VacConfig): VacConfig {
  // 可変配列を複製して設定オブジェクトを正規化する
  return {
    enabled: config.enabled,
    triggerChannelIds: [...config.triggerChannelIds],
    createdChannels: [...config.createdChannels],
  };
}
