// src/shared/locale/locales/en/features/unverifiedKick.ts
// Unverified auto-kick feature translations (English)

export const unverifiedKick = {
  // ── Command definitions ─────────────────────────────
  "unverified-kick-settings.description":
    "Configure auto-kick for unverified members (requires Manage Server)",
  "unverified-kick-settings.set-verified-role.description":
    "Set the verified role (members with it are exempt)",
  "unverified-kick-settings.set-verified-role.role.description":
    "Role that exempts members from kicking when held",
  "unverified-kick-settings.set-grace-days.description":
    "Set the grace days from join to kick",
  "unverified-kick-settings.set-grace-days.days.description":
    "Grace days (1-30)",
  "unverified-kick-settings.set-warn-days.description":
    "Set the days-since-join at which to send the warning",
  "unverified-kick-settings.set-warn-days.days.description":
    "Days since join to warn at (1 to graceDays-1)",
  "unverified-kick-settings.clear-warn-days.description":
    "Disable the advance warning",
  "unverified-kick-settings.set-notify-channel.description":
    "Set the channel for kick notices (member/staff facing)",
  "unverified-kick-settings.set-notify-channel.channel.description":
    "Text channel to post kick notices",
  "unverified-kick-settings.clear-notify-channel.description":
    "Clear the notify channel",
  "unverified-kick-settings.set-log-channel.description":
    "Set the audit log channel for kicks and auto-disable",
  "unverified-kick-settings.set-log-channel.channel.description":
    "Text channel to send the audit log",
  "unverified-kick-settings.clear-log-channel.description":
    "Clear the log channel",
  "unverified-kick-settings.set-marker-role.description":
    "Set the marker role auto-assigned to warned members (for mention)",
  "unverified-kick-settings.set-marker-role.role.description":
    "Role to assign to warned members",
  "unverified-kick-settings.clear-marker-role.description":
    "Unlink the marker role",
  "unverified-kick-settings.set-dm-message.description":
    "Set the custom warning DM message",
  "unverified-kick-settings.clear-dm-message.description":
    "Clear the custom warning DM message",
  "unverified-kick-settings.set-notify-message.description":
    "Set the kick-notice message for the notify channel",
  "unverified-kick-settings.clear-notify-message.description":
    "Clear the kick-notice message for the notify channel",
  "unverified-kick-settings.enable.description": "Enable auto-kick",
  "unverified-kick-settings.disable.description": "Disable auto-kick",
  "unverified-kick-settings.preview.description":
    "Show the current kick / warning targets",
  "unverified-kick-settings.view.description": "Show current settings",
  "unverified-kick-settings.reset.description": "Reset settings",
  "unverified-kick-settings.exempt.description": "Manage exempt roles",
  "unverified-kick-settings.exempt.add.description": "Add an exempt role",
  "unverified-kick-settings.exempt.add.role.description": "Role to exempt",
  "unverified-kick-settings.exempt.remove.description":
    "Select exempt roles to remove (multi-select)",
  "unverified-kick-settings.exempt.list.description": "List exempt roles",

  // ── User responses ────────────────────────
  "user-response.set_verified_role_success":
    "Set the verified role to {{role}}.",
  "user-response.set_grace_days_success":
    "Set the grace period to {{days}} days.",
  "user-response.grace_out_of_range": "Grace days must be between 1 and 30.",
  "user-response.grace_below_warn":
    "Grace days must be greater than the warn days. Lower the warn days first or run /unverified-kick-settings clear-warn-days.",
  "user-response.set_warn_days_success":
    "Will warn members {{days}} days after they join.",
  "user-response.warn_out_of_range":
    "Warn days must be at least 1 and less than the grace days.",
  "user-response.clear_warn_days_success": "Disabled the advance warning.",
  "user-response.text_channel_only": "Please specify a text channel.",
  "user-response.channel_bot_permission":
    "Missing send permissions for that channel (View Channel / Send Messages / Embed Links).",
  "user-response.set_notify_channel_success":
    "Set the notify channel to {{channel}}.",
  "user-response.clear_notify_channel_success": "Cleared the notify channel.",
  "user-response.set_log_channel_success":
    "Set the log channel to {{channel}}.",
  "user-response.clear_log_channel_success": "Cleared the log channel.",
  "user-response.marker_role_bot_permission":
    "Assigning the marker role requires the bot to have the Manage Roles permission.",
  "user-response.set_marker_role_error_hierarchy":
    "That role is at or above the bot's highest role and cannot be assigned. Choose a role below the bot's role.",
  "user-response.set_marker_role_success": "Set the marker role to {{role}}.",
  "user-response.clear_marker_role_success": "Unlinked the marker role.",
  "user-response.set_dm_message_success": "Set the warning DM message.",
  "user-response.clear_dm_message_success": "Cleared the warning DM message.",
  "user-response.set_notify_message_success": "Set the kick-notice message.",
  "user-response.clear_notify_message_success":
    "Cleared the kick-notice message.",
  "user-response.enable_error_no_verified_role":
    "No verified role is set. Run /unverified-kick-settings set-verified-role first.",
  "user-response.enable_error_no_kick_permission":
    "The bot lacks the Kick Members permission. Grant it before enabling.",
  "user-response.enable_success": "Enabled auto-kick.",
  "user-response.disable_success": "Disabled auto-kick.",
  "user-response.exempt_add_success": "Added role {{role}} to the exempt list.",
  "user-response.exempt_add_already": "Already on the exempt list.",
  "user-response.exempt_empty": "The exempt list is empty.",
  "user-response.exempt_remove_count":
    "Removed {{count}} item(s) from the exempt list.",
  "user-response.reset_success": "Settings have been reset.",
  "user-response.reset_cancelled": "Reset cancelled.",
  "user-response.disabled_no_verified_role":
    "Disabled auto-kick because no verified role is set.",
  "user-response.disabled_verified_role_missing":
    "Disabled auto-kick because the verified role is missing (deleted).",
  "user-response.disabled_no_kick_permission":
    "Disabled auto-kick because the bot lacks the Kick Members permission.",

  // ── Settings view / reset embeds ─────
  "embed.title.view": "Unverified Auto-Kick Settings",
  "embed.field.name.verified_role": "Verified Role",
  "embed.field.name.grace_days": "Grace Days",
  "embed.field.name.warn_days": "Warn Days",
  "embed.field.name.notify_channel": "Notify Channel",
  "embed.field.name.log_channel": "Log Channel",
  "embed.field.name.marker_role": "Marker Role",
  "embed.field.name.enabled_at": "Enabled At",
  "embed.field.name.dm_message": "Warning DM Message",
  "embed.field.name.notify_message": "Kick-Notice Message",
  "embed.field.name.exempt_roles": "Exempt Roles",
  "embed.field.name.test_mode_status": "Test Mode (global)",
  "embed.field.value.grace_days": "{{count}} days",
  "embed.field.value.warn_days": "{{count}} days after join",
  "embed.field.value.dm_default": "(unset - default text)",
  "embed.field.value.exempt_count": "{{count}}",
  "embed.title.reset_confirm": "Reset Confirmation",
  "embed.description.reset_confirm":
    "Reset the unverified auto-kick settings? This cannot be undone.",
  "embed.field.name.reset_target": "Reset Targets",
  "embed.field.value.reset_target":
    "Enabled/disabled / verified role / grace days / warn days / notify channel / log channel / marker role / custom DM / exempt roles / enabled time",
  "embed.title.exempt": "Exempt Roles",

  // ── preview ─────
  "preview.title": "🔍 Unverified Kick Preview",
  "preview.none": "No members are currently kick or warning targets.",
  "preview.section.kick": "Kick targets",
  "preview.section.warn": "Warning targets",
  "preview.entry": "{{user}} — {{days}} days since join",

  // ── Audit log reasons ─────
  "audit_reason.marker_assigned":
    "Assigned marker role for unverified kick warning",
  "audit_reason.marker_removed_verified": "Removed marker role on verification",
  "audit_reason.kick":
    "Auto-kicked: not verified within {{days}} days of joining",

  // ── Kick notice embed (notify channel) ─────
  "embed.title.warn": "⏰ Upcoming auto-kick of unverified members",
  "embed.field.name.target_members": "Target Members",
  "embed.field.name.kick_schedule": "Scheduled Kick Date",

  // ── Kick summary embed (log channel) ─────
  "embed.title.kick": "👢 Auto-kicked unverified members",
  "embed.description.kick": "Kicked for not obtaining the {{role}} role.",
  "embed.field.name.kicked_members": "Kicked members",
  "embed.field.name.test_mode": "Test Mode",
  "embed.field.value.test_mode": "(Test mode: no one was actually kicked)",

  // ── Auto-disable embed ─────
  "embed.title.disabled": "⚠️ Disabled unverified auto-kick",

  // ── Warning DM default text (single braces) ─────
  "default.dm_message":
    "On {serverName}, you must complete verification within {graceDays} days of joining. You have not verified yet, so you will be automatically removed in about {remainingDays} day(s). Please follow the in-server instructions to complete verification.",

  // ── Kick-notice default text (notify channel, single braces) ─────
  "default.notify_message":
    "{markerRole} {count} member(s) joined {warnDays} days ago and have not verified yet. They will be automatically removed in about {remainingDays} day(s). Please complete verification soon.",

  // ── UI labels (select / modal) ─────
  "ui.select.exempt_remove_placeholder":
    "Select roles to remove from the exempt list (multi-select)",
  "ui.modal.set_dm_title": "Set Warning DM Message",
  "ui.modal.set_dm_label": "Warning DM Message",
  "ui.modal.set_dm_placeholder":
    "Available: {serverName}, {graceDays}, {warnDays}, {remainingDays} (max 500 chars)",
  "ui.modal.set_notify_title": "Set Kick-Notice Message",
  "ui.modal.set_notify_label": "Kick-Notice Message",
  "ui.modal.set_notify_placeholder":
    "Available: {count}, {serverName}, {graceDays}, {warnDays}, {remainingDays}, {markerRole} (max 500 chars)",

  // ── Logs ─────────────────────────────────────
  "log.config_updated":
    "Settings updated GuildId: {{guildId}} action: {{action}}",
  "log.cron_override":
    "Daily check schedule overridden (UNVERIFIED_KICK_CRON): {{schedule}}",
  "log.cron_invalid":
    "UNVERIFIED_KICK_CRON is an invalid cron expression; using default: {{schedule}}",
  "log.marker_role_remove_failed":
    "Failed to remove marker role GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_removed_verified":
    "Removed marker role on verification GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_assign_failed":
    "Failed to assign marker role GuildId: {{guildId}} UserId: {{userId}}",
  "log.notification_failed":
    "Failed to send notification GuildId: {{guildId}} stage: {{stage}}",
  "log.kick_skipped_unkickable":
    "Skipped unkickable member GuildId: {{guildId}} UserId: {{userId}}",
  "log.kicked": "Auto-kicked GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_failed": "Failed to kick GuildId: {{guildId}} UserId: {{userId}}",
  "log.guild_disabled_invalid":
    "Auto-disabled due to invalid settings GuildId: {{guildId}} reason: {{reason}}",
  "log.members_fetch_failed": "Failed to fetch members GuildId: {{guildId}}",
  "log.daily_check_started": "Daily check started",
  "log.daily_check_completed":
    "Daily check completed; guilds processed: {{guildCount}}",
  "log.guild_check_failed": "Guild daily check failed GuildId: {{guildId}}",
} as const;
