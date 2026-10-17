// 複数のコマンドで共通して使われる i18n キー定数

export const COMMON_I18N_KEYS = {
  GUILD_ONLY: "common:validation.guild_only",
  INVALID_SUBCOMMAND: "common:validation.invalid_subcommand",
  THREAD_NOT_SUPPORTED: "common:validation.thread_not_supported",
  TEXT_CHANNEL_ONLY: "common:validation.text_channel_only",
  INVALID_COLOR: "common:validation.invalid_color",
  MANAGE_GUILD_REQUIRED: "common:permission.manage_guild_required",
  TITLE_CHANNEL_INVALID: "common:title_channel_invalid",
} as const;
