// src/bot/shared/i18nKeys.ts
// 複数のコマンドで共通して使われる i18n キー定数

export const COMMON_I18N_KEYS = {
  GUILD_ONLY: "common:validation.guild_only",
  INVALID_SUBCOMMAND: "common:validation.invalid_subcommand",
  MANAGE_GUILD_REQUIRED: "common:permission.manage_guild_required",
  EMBED_TITLE_SUCCESS: "common:embed.title.success",
  EMBED_FIELD_NAME_STATUS: "common:embed.field.name.status",
  EMBED_FIELD_VALUE_NOT_CONFIGURED: "common:embed.field.value.not_configured",
  UI_BUTTON_CANCEL: "common:ui.button.cancel",
  UI_BUTTON_RESET_CONFIRM: "common:ui.button.reset_confirm",
  UI_BUTTON_RESET_CANCEL: "common:ui.button.reset_cancel",
} as const;
