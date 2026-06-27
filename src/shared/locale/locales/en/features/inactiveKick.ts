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
  "inactive-kick-settings.set-week-warn-message.description":
    "Set the custom one-week-before notice message",
  "inactive-kick-settings.clear-week-warn-message.description":
    "Clear the custom one-week-before notice message",
  "inactive-kick-settings.set-final-warn-message.description":
    "Set the custom final-warning (3 days before) message",
  "inactive-kick-settings.clear-final-warn-message.description":
    "Clear the custom final-warning (3 days before) message",
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
    "Pick items from the exclusion list to remove (multi-select)",
  "inactive-kick-settings.whitelist.list.description":
    "Show the exclusion list",
  "inactive-kick-settings.set-timezone.description":
    "Set the timezone for notifications and kicks",
  "inactive-kick-settings.set-run-hour.description":
    "Set the hour at which to run notifications and kicks",
  "inactive-kick-settings.mention.description":
    "Manage individual mention notifications",
  "inactive-kick-settings.mention.enable.description":
    "Enable individual mention notifications",
  "inactive-kick-settings.mention.disable.description":
    "Disable individual mention notifications",
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
  "user-response.set_week_warn_message_success":
    "Set the one-week-before notice message.",
  "user-response.clear_week_warn_message_success":
    "Cleared the one-week-before notice message.",
  "user-response.set_final_warn_message_success":
    "Set the final-warning message.",
  "user-response.clear_final_warn_message_success":
    "Cleared the final-warning message.",
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
  "user-response.whitelist_empty": "The exclusion list is empty.",
  "user-response.whitelist_remove_count":
    "Removed {{count}} item(s) from the exclusion list.",
  "user-response.set_timezone_success": "Set the timezone to {{timezone}}.",
  "user-response.set_run_hour_success": "Set the run hour to {{hour}}:00.",
  "user-response.mention_enabled": "Enabled individual mention notifications.",
  "user-response.mention_disabled":
    "Disabled individual mention notifications.",
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
  "embed.field.name.week_warn_message": "1-week notice message",
  "embed.field.name.final_warn_message": "Final-warning message",
  "embed.field.name.kick_message": "Kick notification message",
  "embed.field.name.whitelist": "Exclusion list",
  "embed.field.name.timezone": "Timezone",
  "embed.field.name.run_hour": "Run hour",
  "embed.field.name.mention_enabled": "Individual mentions",
  "embed.field.value.threshold_days": "{{count}} days",
  "embed.field.value.whitelist_counts": "{{roles}} role(s) / {{users}} user(s)",
  "embed.field.value.message_default_prefix": "(not set — default text)",
  "embed.field.value.kick_message_unset": "Not set (no body — embed only)",
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
  "embed.field.name.kick_schedule": "Scheduled kick date and time",
  "default.week_warn_message":
    'There are {count} member(s) inactive for a long time on "{serverName}". They will be automatically kicked. The scheduled kick date is shown in the notification embed. To stay, please be active by posting a message or adding a reaction.',
  "default.final_warn_message":
    '[Final warning] {count} inactive member(s) on "{serverName}" will be kicked. To avoid removal, be active now by posting a message or adding a reaction. The scheduled kick date is shown in the notification embed.',

  // ── Kick notification embed ─────
  "embed.title.kick": "👋 Inactive members were auto-kicked",
  "embed.field.name.kicked_members": "Kicked members",
  "embed.field.name.test_mode": "Test mode",
  "embed.field.value.test_mode": "(Test mode: no one was actually kicked)",

  // ── Deprecated placeholder notice embed ─────
  "embed.title.obsolete_notice": "Custom message settings update",
  "embed.description.obsolete_notice":
    "Your custom messages contain deprecated placeholders. Please review the changes below and update your custom messages.",
  "embed.field.name.obsolete_marker_role": "{markerRole} deprecated",
  "embed.field.value.obsolete_marker_role":
    "Bulk role mentions have been replaced with individual member mentions.\nYou can toggle mention notifications via commands or the dashboard.\n・Command: /inactive-kick-settings mention enable / disable\n・Dashboard: Feature settings > Mention notifications",
  "embed.field.name.obsolete_days_left": "{daysLeft} deprecated",
  "embed.field.value.obsolete_days_left":
    "The remaining-days placeholder has been removed.\nThe scheduled kick date and time is now shown per member in the notification embed.",

  // ── UI labels (modals) ─────
  "ui.select.whitelist_remove_placeholder":
    "Select items to remove from the exclusion list (multi-select)",
  "ui.select.set_timezone_placeholder": "Select a timezone",
  "ui.select.set_run_hour_placeholder": "Select a run hour",
  "ui.modal.set_week_warn_message_title": "Set 1-week notice message",
  "ui.modal.set_week_warn_message_label": "1-week notice message",
  "ui.modal.set_final_warn_message_title": "Set final-warning message",
  "ui.modal.set_final_warn_message_label": "Final-warning message",
  "ui.modal.set_warn_message_placeholder":
    "You can use {count}, {thresholdDays}, {serverName} (max 500 chars)",
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
  "log.cron_override":
    "Daily-check schedule overridden (INACTIVE_KICK_CRON): {{schedule}}",
  "log.cron_invalid":
    "INACTIVE_KICK_CRON is not a valid cron expression; using default: {{schedule}}",
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
