// src/shared/features/afk/afkConfigDefaults.ts
// AFK設定のデフォルト値・正規化ロジック

import type { AfkConfig } from "../../database/types";

/** AFK設定の初期値 */
export const DEFAULT_AFK_CONFIG: AfkConfig = {
  enabled: false,
};

/**
 * AFK設定の初期値を生成する
 */
export function createDefaultAfkConfig(): AfkConfig {
  // 既定値から新しい設定オブジェクトを都度生成して返す
  return {
    enabled: DEFAULT_AFK_CONFIG.enabled,
  };
}

/**
 * AFK設定を正規化して返す
 */
export function normalizeAfkConfig(config: AfkConfig): AfkConfig {
  // 呼び出し元との参照共有を防ぐためコピーを返す
  return {
    enabled: config.enabled,
    channelId: config.channelId,
  };
}
