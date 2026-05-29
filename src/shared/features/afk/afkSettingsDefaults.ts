// src/shared/features/afk/afkSettingsDefaults.ts
// AFK設定のデフォルト値・正規化ロジック

import type { AfkSettings } from "../../database/types";

/** AFK設定の初期値 */
export const DEFAULT_AFK_SETTINGS: AfkSettings = {
  enabled: false,
};

/**
 * AFK設定の初期値を生成する
 */
export function createDefaultAfkSettings(): AfkSettings {
  // 既定値から新しい設定オブジェクトを都度生成して返す
  return {
    enabled: DEFAULT_AFK_SETTINGS.enabled,
  };
}

/**
 * AFK設定を正規化して返す
 */
export function normalizeAfkSettings(config: AfkSettings): AfkSettings {
  // 呼び出し元との参照共有を防ぐためコピーを返す
  return {
    enabled: config.enabled,
    channelId: config.channelId,
  };
}
