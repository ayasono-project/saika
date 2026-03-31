// src/shared/locale/locales/en/features/memberLog.ts
// Member Log feature translations (English)

export const memberLog = {
  // ── Command definitions ──────────────────────
  "member-log-config.description":
    "Configure member log feature (requires Manage Server)",
  "member-log-config.set-channel.description": "Set the notification channel",
  "member-log-config.set-channel.channel.description":
    "Text channel to send notifications to",
  "member-log-config.enable.description": "Enable member log feature",
  "member-log-config.disable.description": "Disable member log feature",
  "member-log-config.set-join-message.description": "Set a custom join message",
  "member-log-config.set-leave-message.description":
    "Set a custom leave message",
  "member-log-config.clear-join-message.description":
    "Clear the custom join message",
  "member-log-config.clear-leave-message.description":
    "Clear the custom leave message",
  "member-log-config.reset.description": "Reset member log settings",
  "member-log-config.view.description": "Show current settings",

  // ── User responses ─────────────────────────────
  "user-response.set_channel_success":
    "Notification channel set to {{channel}}",
  "user-response.enable_success": "Member log feature has been enabled",
  "user-response.enable_error_no_channel":
    "No notification channel is configured. Run /member-log-config set-channel first.",
  "user-response.disable_success": "Member log feature has been disabled",
  "user-response.set_join_message_success": "Join message has been set",
  "user-response.set_leave_message_success": "Leave message has been set",
  "user-response.clear_join_message_success": "Join message has been cleared",
  "user-response.clear_leave_message_success": "Leave message has been cleared",
  "user-response.text_channel_only": "Please specify a text channel.",
  "user-response.reset_success": "Member log settings have been reset.",
  "user-response.reset_cancelled": "Reset has been cancelled.",
  "user-response.channel_deleted_notice":
    "⚠️ The member log notification channel has been deleted.\nSettings have been reset. Please reconfigure with `/member-log-config set-channel`.",

  // ── Embed ─────────────────────────────────────
  "embed.title.config_view": "Member Log",
  "embed.title.reset_confirm": "Member Log Settings Reset",
  "embed.description.reset_confirm":
    "Reset member log settings?\nThe following settings will be deleted. This action cannot be undone.",
  "embed.field.name.reset_target": "Targets",
  "embed.field.value.reset_target":
    "Enabled/Disabled / Notification Channel / Custom Join Message / Custom Leave Message",
  "embed.description.not_configured": "Member log is not configured.",
  "embed.field.name.channel": "Notification Channel",
  "embed.field.name.join_message": "Join Message",
  "embed.field.name.leave_message": "Leave Message",

  // Join notification embed
  "embed.title.join": "👋 A new member has joined!",
  "embed.field.name.join_username": "User",
  "embed.field.name.join_account_created": "Account Created",
  "embed.field.name.join_server_joined": "Joined Server At",
  "embed.field.name.join_member_count": "Member Count",
  "embed.field.name.join_invited_by": "Invite Source",

  // Leave notification embed
  "embed.title.leave": "👋 A member has left",
  "embed.field.name.leave_username": "User",
  "embed.field.name.leave_account_created": "Account Created",
  "embed.field.name.leave_server_joined": "Joined Server At",
  "embed.field.name.leave_server_left": "Left Server At",
  "embed.field.name.leave_stay_duration": "Stay Duration",
  "embed.field.name.leave_member_count": "Member Count",

  // Embed field values (shared formatting)
  "embed.field.value.days": "{{count}} days",
  "embed.field.value.member_count": "{{count}} members",
  "embed.field.value.unknown": "Unknown",
  "embed.field.value.age_years": "{{count}}yr",
  "embed.field.value.age_months": "{{count}}mo",
  "embed.field.value.age_days": "{{count}}d",
  "embed.field.value.age_separator": " ",

  // ── UI labels ──────────────────────────────────
  "ui.modal.set_join_message_title": "Set Join Message",
  "ui.modal.set_join_message_label": "Join message",
  "ui.modal.set_join_message_placeholder":
    "Supports {userMention}, {userName}, {memberCount}, {serverName} (max 500 characters)",
  "ui.modal.set_leave_message_title": "Set Leave Message",
  "ui.modal.set_leave_message_label": "Leave message",
  "ui.modal.set_leave_message_placeholder":
    "Supports {userMention}, {userName}, {memberCount}, {serverName} (max 500 characters)",

  // ── Logs ─────────────────────────────────────
  "log.join_notification_sent":
    "join notification sent GuildId: {{guildId}} UserId: {{userId}}",
  "log.leave_notification_sent":
    "leave notification sent GuildId: {{guildId}} UserId: {{userId}}",
  "log.notification_failed": "failed to send notification GuildId: {{guildId}}",
  "log.channel_not_found":
    "channel not found GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted_config_cleared":
    "channel deleted, config cleared GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_set_channel":
    "channel configured GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_enabled": "enabled GuildId: {{guildId}}",
  "log.config_disabled": "disabled GuildId: {{guildId}}",
  "log.config_join_message_set": "join message set GuildId: {{guildId}}",
  "log.config_leave_message_set": "leave message set GuildId: {{guildId}}",
  "log.config_join_message_cleared":
    "join message cleared GuildId: {{guildId}}",
  "log.config_reset": "settings reset GuildId: {{guildId}}",
  "log.config_leave_message_cleared":
    "leave message cleared GuildId: {{guildId}}",
  "log.database_user_setting_find_failed":
    "Failed to find user setting UserId: {{userId}} GuildId: {{guildId}}",
  "log.database_user_setting_upsert_failed":
    "Failed to upsert user setting UserId: {{userId}} GuildId: {{guildId}}",
} as const;

export type MemberLogTranslations = typeof memberLog;
