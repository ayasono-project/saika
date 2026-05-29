// src/bot/features/guild-settings/constants/guildSettings.constants.ts
// ギルド設定機能の定数定義

/** reset / reset-all / import 確認ダイアログのタイムアウト（ms） */
export const CONFIRM_TIMEOUT_MS: number = 60_000;

/** customId 定数 */
export const GUILD_SETTINGS_CUSTOM_ID = {
  // reset
  RESET_CONFIRM: "guild-settings:reset-confirm",
  RESET_CANCEL: "guild-settings:reset-cancel",
  // reset-all
  RESET_ALL_CONFIRM: "guild-settings:reset-all-confirm",
  RESET_ALL_CANCEL: "guild-settings:reset-all-cancel",
  // import
  IMPORT_CONFIRM: "guild-settings:import-confirm",
  IMPORT_CANCEL: "guild-settings:import-cancel",
} as const;
