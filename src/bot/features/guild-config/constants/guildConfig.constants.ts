// src/bot/features/guild-config/constants/guildConfig.constants.ts
// ギルド設定機能の定数定義

/** view ページ操作のタイムアウト（ms） */
export const VIEW_TIMEOUT_MS: number = 5 * 60 * 1000;

/** reset / reset-all / import 確認ダイアログのタイムアウト（ms） */
export const CONFIRM_TIMEOUT_MS: number = 60_000;

/** ページネーション customId プレフィックス */
export const GUILD_CONFIG_PREFIX = "guild-config";

/** customId 定数 */
export const GUILD_CONFIG_CUSTOM_ID = {
  // ページネーション
  PAGE_FIRST: "guild-config:page-first",
  PAGE_PREV: "guild-config:page-prev",
  PAGE_JUMP: "guild-config:page-jump",
  PAGE_NEXT: "guild-config:page-next",
  PAGE_LAST: "guild-config:page-last",
  PAGE_SELECT: "guild-config:page-select",
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

/** ページセレクトメニューの value 定数 */
export const PAGE_VALUES = {
  GUILD_CONFIG: "guild_config",
  AFK: "afk",
  VAC: "vac",
  VC_RECRUIT: "vc_recruit",
  STICKY: "sticky",
  MEMBER_LOG: "member_log",
  BUMP: "bump",
} as const;

/** ページ定義の型 */
interface ViewPageDef {
  readonly value: string;
  readonly emoji: string;
  readonly labelKey: string;
}

/** ページ定義（順番固定） */
export const VIEW_PAGES: readonly ViewPageDef[] = [
  {
    value: PAGE_VALUES.GUILD_CONFIG,
    emoji: "🛡️",
    labelKey: "guildConfig:ui.select.guild_config",
  },
  {
    value: PAGE_VALUES.AFK,
    emoji: "😴",
    labelKey: "guildConfig:ui.select.afk",
  },
  {
    value: PAGE_VALUES.VAC,
    emoji: "🔊",
    labelKey: "guildConfig:ui.select.vac",
  },
  {
    value: PAGE_VALUES.VC_RECRUIT,
    emoji: "📢",
    labelKey: "guildConfig:ui.select.vc_recruit",
  },
  {
    value: PAGE_VALUES.STICKY,
    emoji: "📌",
    labelKey: "guildConfig:ui.select.sticky",
  },
  {
    value: PAGE_VALUES.MEMBER_LOG,
    emoji: "👋",
    labelKey: "guildConfig:ui.select.member_log",
  },
  {
    value: PAGE_VALUES.BUMP,
    emoji: "🔔",
    labelKey: "guildConfig:ui.select.bump",
  },
] as const;
