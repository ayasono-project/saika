// src/shared/locale/locales/en/features/inactiveKick.ts
// Inactive auto-kick feature translations (English)

export const inactiveKick = {
  // ── Command definitions ─────────────────────────────
  "inactive-kick-settings.description":
    "Inactive member auto-kick settings (requires Manage Server)",
  "inactive-kick-settings.set-channel.description":
    "Set the notification channel",
  "inactive-kick-settings.set-channel.channel.description":
    "Text channel to send notifications to",
  "inactive-kick-settings.set-threshold.description":
    "Set the days of inactivity before kicking",
  "inactive-kick-settings.set-threshold.days.description":
    "Inactivity threshold in days (14-365)",
  "inactive-kick-settings.enable.description": "Enable the auto-kick feature",
  "inactive-kick-settings.disable.description": "Disable the auto-kick feature",
  "inactive-kick-settings.set-warn-message.description":
    "Set a custom advance-notice message",
  "inactive-kick-settings.clear-warn-message.description":
    "Clear the custom advance-notice message",
  "inactive-kick-settings.set-kick-message.description":
    "Set a custom kick notification message",
  "inactive-kick-settings.clear-kick-message.description":
    "Clear the custom kick notification message",
  "inactive-kick-settings.set-marker-role.description":
    "Set the marker role assigned to warned members",
  "inactive-kick-settings.set-marker-role.role.description":
    "Role to assign to warned members",
  "inactive-kick-settings.clear-marker-role.description":
    "Disable the marker role integration",
  "inactive-kick-settings.whitelist.description":
    "Manage the kick exclusion list",
  "inactive-kick-settings.whitelist.add.description":
    "Add a role/user to the exclusion list",
  "inactive-kick-settings.whitelist.add.role.description": "Role to exclude",
  "inactive-kick-settings.whitelist.add.user.description": "User to exclude",
  "inactive-kick-settings.whitelist.remove.description":
    "Remove a role/user from the exclusion list",
  "inactive-kick-settings.whitelist.remove.role.description": "Role to remove",
  "inactive-kick-settings.whitelist.remove.user.description": "User to remove",
  "inactive-kick-settings.whitelist.list.description":
    "Show the exclusion list",
  "inactive-kick-settings.preview.description":
    "Show current kick/notification targets",
  "inactive-kick-settings.view.description": "Show current settings",
  "inactive-kick-settings.reset.description": "Reset the settings",

  // ── User responses ────────────────────────
  "user-response.set_channel_success":
    "Set the notification channel to {{channel}}.",
  "user-response.text_channel_only": "Please specify a text channel.",
  "user-response.channel_bot_permission":
    "Missing permissions to send to that channel (View Channel / Send Messages / Embed Links).",
  "user-response.set_threshold_success":
    "Set the inactivity threshold to {{days}} days.",
  "user-response.threshold_out_of_range":
    "Please specify a value between 14 and 365 days.",
  "user-response.enable_success": "Enabled the auto-kick feature.",
  "user-response.enable_error_no_channel":
    "No notification channel is set. Run /inactive-kick-settings set-channel first.",
  "user-response.disable_success": "Disabled the auto-kick feature.",
  "user-response.set_warn_message_success": "Set the advance-notice message.",
  "user-response.clear_warn_message_success":
    "Cleared the advance-notice message.",
  "user-response.set_kick_message_success":
    "Set the kick notification message.",
  "user-response.clear_kick_message_success":
    "Cleared the kick notification message.",
  "user-response.set_marker_role_success": "Set the marker role to {{role}}.",
  "user-response.set_marker_role_error_hierarchy":
    "That role is at or above the bot's highest role and cannot be assigned. Choose a role below the bot's role.",
  "user-response.marker_role_bot_permission":
    "The bot needs the Manage Roles permission to assign the marker role.",
  "user-response.clear_marker_role_success":
    "Disabled the marker role integration.",
  "user-response.whitelist_requires_target":
    "Please specify either a role or a user.",
  "user-response.whitelist_add_role_success":
    "Added role {{role}} to the exclusion list.",
  "user-response.whitelist_add_user_success":
    "Added user {{user}} to the exclusion list.",
  "user-response.whitelist_add_already": "Already in the exclusion list.",
  "user-response.whitelist_remove_role_success":
    "Removed role {{role}} from the exclusion list.",
  "user-response.whitelist_remove_user_success":
    "Removed user {{user}} from the exclusion list.",
  "user-response.whitelist_remove_not_found":
    "The specified target is not in the exclusion list.",
  "user-response.reset_success": "Reset the settings.",
  "user-response.reset_cancelled": "Cancelled the reset.",
  "user-response.channel_deleted_notice":
    "⚠️ The auto-kick notification channel was deleted, so the feature has been disabled.",

  // ── Settings view / reset embed ─────
  "embed.title.view": "Inactive Auto-Kick Settings",
  "embed.field.name.channel": "Notification channel",
  "embed.field.name.threshold": "Inactivity threshold",
  "embed.field.name.enabled_at": "Enabled at",
  "embed.field.name.marker_role": "Marker role",
  "embed.field.name.warn_message": "Advance-notice message",
  "embed.field.name.kick_message": "Kick notification message",
  "embed.field.name.whitelist": "Exclusion list",
  "embed.field.value.threshold_days": "{{count}} days",
  "embed.field.value.whitelist_counts": "{{roles}} role(s) / {{users}} user(s)",
  "embed.field.value.message_set": "Set",
  "embed.field.name.test_mode_status": "Test mode (global)",
  "embed.title.reset_confirm": "Reset confirmation",
  "embed.description.reset_confirm":
    "Reset the inactive auto-kick settings? This cannot be undone (activity history is preserved).",
  "embed.field.name.reset_target": "Will be removed",
  "embed.field.value.reset_target":
    "Enabled state / channel / threshold / custom messages / marker role / exclusion list / enabled-at",
  "embed.title.whitelist": "Exclusion list",
  "embed.field.name.whitelist_roles": "Excluded roles",
  "embed.field.name.whitelist_users": "Excluded users",

  // ── preview ─────
  "preview.title": "🔍 Auto-kick target preview",
  "preview.none": "There are currently no kick/notification target members.",
  "preview.section.kick": "Kick targets",
  "preview.section.final": "Final warning targets",
  "preview.section.week": "One-week notice targets",
  "preview.entry": "{{user}} — inactive for {{days}} days",

  // ── Audit log reasons ─────
  "audit_reason.reactivated": "Marker role removed due to detected activity",
  "audit_reason.marker_assigned": "Marker role added for inactivity warning",
  "audit_reason.kick": "Auto-kicked for prolonged inactivity",

  // ── Staged warning embed ─────
  "embed.title.warn": "⏰ Inactive member auto-kick notice",
  "embed.field.name.target_members": "Target members",
  "embed.field.name.kick_schedule": "Scheduled kick",
  "embed.field.value.days_left": "in {{count}} day(s)",
  "embed.field.value.soon": "soon",
  "default.warn_message":
    'There are {count} member(s) inactive for a long time on "{serverName}". They will be automatically kicked in {daysLeft} day(s). To stay, please be active by posting a message or adding a reaction.',

  // ── Kick notification embed ─────
  "embed.title.kick": "👋 Inactive members were auto-kicked",
  "embed.field.name.kicked_members": "Kicked members",
  "embed.field.name.test_mode": "Test mode",
  "embed.field.value.test_mode": "(Test mode: no one was actually kicked)",
  "default.kick_message":
    'Automatically kicked {count} member(s) who had been inactive for {thresholdDays}+ days on "{serverName}".',

  // ── UI labels (modals) ─────
  "ui.modal.set_warn_message_title": "Set advance-notice message",
  "ui.modal.set_warn_message_label": "Advance-notice message",
  "ui.modal.set_warn_message_placeholder":
    "You can use {count}, {daysLeft}, {thresholdDays}, {serverName}, {markerRole} (max 500 chars)",
  "ui.modal.set_kick_message_title": "Set kick notification message",
  "ui.modal.set_kick_message_label": "Kick notification message",
  "ui.modal.set_kick_message_placeholder":
    "You can use {count}, {thresholdDays}, {serverName} (max 500 chars)",

  // ── Logs ─────────────────────────────────────
  "log.activity_record_failed":
    "Failed to record activity GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_remove_failed":
    "Failed to remove marker role GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_assign_failed":
    "Failed to assign marker role GuildId: {{guildId}} UserId: {{userId}}",
  "log.activity_cleanup_failed":
    "Failed to delete activity record GuildId: {{guildId}} UserId: {{userId}}",
  "log.daily_check_started": "Daily check started",
  "log.daily_check_completed": "Daily check completed Guilds: {{guildCount}}",
  "log.guild_check_failed": "Daily check failed for guild GuildId: {{guildId}}",
  "log.guild_disabled_invalid":
    "Auto-disabled due to invalid settings GuildId: {{guildId}} reason: {{reason}}",
  "log.members_fetch_failed": "Failed to fetch members GuildId: {{guildId}}",
  "log.notification_failed":
    "Failed to send notification GuildId: {{guildId}} stage: {{stage}}",
  "log.kicked": "Auto-kick executed GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_failed": "Failed to kick GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_skipped_unkickable":
    "Skipped unkickable member GuildId: {{guildId}} UserId: {{userId}}",
  "log.config_updated":
    "Settings updated GuildId: {{guildId}} action: {{action}}",
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
