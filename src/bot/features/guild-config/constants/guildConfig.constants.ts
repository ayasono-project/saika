// src/bot/features/guild-config/constants/guildConfig.constants.ts
// ギルド設定機能の定数定義

/** reset / reset-all / import 確認ダイアログのタイムアウト（ms） */
export const CONFIRM_TIMEOUT_MS: number = 60_000;

/** customId 定数 */
export const GUILD_CONFIG_CUSTOM_ID = {
  // reset
  RESET_CONFIRM: "guild-config:reset-confirm",
  RESET_CANCEL: "guild-config:reset-cancel",
  // reset-all
  RESET_ALL_CONFIRM: "guild-config:reset-all-confirm",
  RESET_ALL_CANCEL: "guild-config:reset-all-cancel",
  // import
  IMPORT_CONFIRM: "guild-config:import-confirm",
  IMPORT_CANCEL: "guild-config:import-cancel",
} as const;
