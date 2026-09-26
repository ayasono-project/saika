// Guild config feature translations (English)

export const guildSettings = {
  // ── Command definitions ──────────────────────
  "guild-settings.description":
    "Manage guild settings (requires Manage Server)",
  "guild-settings.set-locale.description": "Set bot response language",
  "guild-settings.set-locale.locale.description": "Select a language",
  "guild-settings.set-error-channel.description":
    "Set error notification channel",
  "guild-settings.set-error-channel.channel.description":
    "Text channel for error notifications",
  "guild-settings.view.description": "View current guild settings",
  "guild-settings.reset.description": "Reset guild settings",
  "guild-settings.reset-all.description": "Reset all feature settings",

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
  // Confirmation text for an irreversible action. Keep it in sync with the tables
  // GuildSettingsAggregateRepository.deleteAllSettings actually deletes.
  "embed.field.value.reset_all_target":
    "Language / Error Channel / AFK / Auto VC (VAC) / VC Auto Recruit / Sticky Message / Member Log / Bump Reminder (incl. scheduled) / Tickets (settings and records) / Reaction Roles / Unverified Kick (incl. warnings)",

  // ── embed: join_intro (DM on install) ─────────
  "embed.title.join_intro": "Thanks for adding Saika",
  "embed.description.join_intro":
    "Saika is a Discord server management bot.\nStart with `/help` to see what it can do. Settings are managed through each feature's `*-settings` command or the web dashboard.",
  "embed.field.name.data_retention": "Data retention",
  "embed.field.value.data_retention":
    "If you remove Saika from your server, its settings are kept for **{{days}} days**. Add it back within that window and your settings will still be there. After {{days}} days the data is deleted automatically.\nTo delete it right away, run `/guild-settings reset-all` **before removing Saika** (immediate and irreversible). Once Saika is removed the command can no longer be run, so the data stays until it is deleted automatically after {{days}} days.",
  "embed.field.name.manual": "Manual",
  "embed.field.name.dashboard": "Web dashboard",
  "embed.field.name.privacy_policy": "Privacy policy",
  "embed.field.name.support_server": "Support server",

  // ── embed: join_return (DM on re-install) ─────
  "embed.title.join_return": "Your previous data was carried over",
  "embed.description.join_return":
    "Welcome back. This server's data was scheduled for automatic deletion on **{{deleteAt}}**, but because Saika was added back, the deletion was cancelled and your previous data was carried over.",

  // ── UI labels ─────────────────────────────────
  "ui.button.reset_all_confirm": "Reset",
  "ui.button.reset_all_cancel": "Cancel",

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
} as const;

export type GuildSettingsTranslations = typeof guildSettings;
