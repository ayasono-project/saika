// src/shared/locale/locales/en/features/guildConfig.ts
// Guild config feature translations (English)

export const guildConfig = {
  // ── Command definitions ──────────────────────
  "guild-config.description": "Manage guild settings (requires Manage Server)",
  "guild-config.set-locale.description": "Set bot response language",
  "guild-config.set-locale.locale.description": "Select a language",
  "guild-config.set-error-channel.description":
    "Set error notification channel",
  "guild-config.set-error-channel.channel.description":
    "Text channel for error notifications",
  "guild-config.view.description": "View current guild settings",
  "guild-config.reset.description": "Reset guild settings",
  "guild-config.reset-all.description": "Reset all feature settings",
  "guild-config.export.description": "Export guild settings",
  "guild-config.import.description": "Import guild settings from JSON file",
  "guild-config.import.file.description": "Exported JSON file",

  // ── Choice names ──────────────────────────────
  "choice.locale.ja": "Japanese",
  "choice.locale.en": "English",

  // ── User responses ───────────────────────────
  "user-response.set_locale_success":
    'Server language has been set to "{{locale}}".',
  "user-response.set_error_channel_success":
    "Error notification channel has been set to {{channel}}.",
  "user-response.invalid_channel_type": "Please specify a text channel.",
  "user-response.reset_success": "Guild settings have been reset.",
  "user-response.reset_cancelled": "Reset has been cancelled.",
  "user-response.reset_all_success": "All feature settings have been reset.",
  "user-response.reset_all_cancelled": "Reset has been cancelled.",
  "user-response.export_success": "Guild settings have been exported.",
  "user-response.export_empty": "No settings to export.",
  "user-response.import_success": "Guild settings have been imported.",
  "user-response.import_cancelled": "Import has been cancelled.",
  "user-response.import_invalid_json":
    "Invalid file format. Please attach an exported JSON file.",
  "user-response.import_unsupported_version":
    "This file version is not supported.",
  "user-response.import_guild_mismatch":
    "This file belongs to a different server. Please use a file exported from the same server.",
  "user-response.import_missing_channels":
    "Some channels or roles were not found. Please review the settings.",

  // ── embed: view ───────────────────────────────
  "embed.title.view": "Guild Settings",
  "embed.field.name.locale": "Language",
  "embed.field.name.error_channel": "Error Notification Channel",

  // ── embed: reset_confirm ──────────────────────
  "embed.title.reset_confirm": "Guild Settings Reset",
  "embed.description.reset_confirm":
    "Reset guild settings (language, error channel)?\nThis action cannot be undone.",

  // ── embed: reset_all_confirm ──────────────────
  "embed.title.reset_all_confirm": "Reset All Settings",
  "embed.description.reset_all_confirm":
    "Reset all feature settings?\nAll settings below will be deleted. This action cannot be undone.",
  "embed.field.name.reset_all_target": "Targets",
  "embed.field.value.reset_all_target":
    "Language / Error Channel / AFK / VAC / VC Recruit / Sticky Message / Member Log / Bump Reminder",

  // ── embed: import_confirm ─────────────────────
  "embed.title.import_confirm": "Import Guild Settings",
  "embed.description.import_confirm":
    "Current settings will be overwritten. This action cannot be undone.",

  // ── UI labels ─────────────────────────────────
  "ui.select.view_placeholder": "Select a page...",
  "ui.select.guild_config": "Guild Settings",
  "ui.select.afk": "AFK",
  "ui.select.vac": "VAC",
  "ui.select.vc_recruit": "VC Recruit",
  "ui.select.sticky": "Sticky Message",
  "ui.select.member_log": "Member Log",
  "ui.select.bump": "Bump Reminder",
  "ui.button.reset_all_confirm": "Reset",
  "ui.button.reset_all_cancel": "Cancel",
  "ui.button.import_confirm": "Import",
  "ui.button.import_cancel": "Cancel",

  // ── Error channel notifications ─────────────────
  "error-notification.title": "Error Notification",
  "error-notification.warn_title": "Warning Notification",
  "error-notification.feature": "Feature",
  "error-notification.action": "Action",
  "error-notification.message": "Details",

  // ── Logs ──────────────────────────────────────
  "log.locale_set": "Language set GuildId: {{guildId}} Locale: {{locale}}",
  "log.error_channel_set":
    "Error channel set GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.reset": "Guild settings reset GuildId: {{guildId}}",
  "log.reset_all": "All settings reset GuildId: {{guildId}}",
  "log.exported": "Guild settings exported GuildId: {{guildId}}",
  "log.imported": "Guild settings imported GuildId: {{guildId}}",
} as const;

export type GuildConfigTranslations = typeof guildConfig;
