// src/shared/locale/locales/en/features/bumpReminder.ts
// Bump Reminder feature translations (English)

export const bumpReminder = {
  // ── Command definitions ──────────────────────
  "bump-reminder-config.description":
    "Configure bump reminder (requires Manage Server)",
  "bump-reminder-config.enable.description": "Enable bump reminder feature",
  "bump-reminder-config.disable.description": "Disable bump reminder feature",
  "bump-reminder-config.set-mention.description": "Set mention role",
  "bump-reminder-config.set-mention.role.description":
    "Role to mention in reminders",
  "bump-reminder-config.remove-mention.description":
    "Remove mention role setting",
  "bump-reminder-config.remove-mention-users.description":
    "Remove notification users",
  "bump-reminder-config.reset.description": "Reset bump reminder settings",
  "bump-reminder-config.view.description": "Show current settings",

  // ── User responses ───────────────────────────
  "user-response.enable_success": "Bump reminder feature has been enabled",
  "user-response.disable_success": "Bump reminder feature has been disabled",
  "user-response.set_mention_role_success": "Mention role set to {{role}}",
  "user-response.set_mention_error": "Failed to set mention role.",
  "user-response.remove_mention_role":
    "Mention role registration has been removed",
  "user-response.reminder_message_disboard": "⏰ `/bump` is ready!",
  "user-response.reminder_message_dissoku": "⏰ `/up` is ready!",
  "user-response.reminder_message": "⏰ **Ready to bump!**",
  "user-response.panel_scheduled_at":
    "Reminder will be sent <t:{{timestamp}}:R>.",
  "user-response.panel_mention_toggled_on": "Notification turned ON.",
  "user-response.panel_mention_toggled_off": "Notification turned OFF.",
  "user-response.reset_success": "Bump reminder settings have been reset.",
  "user-response.reset_cancelled": "Reset has been cancelled.",
  "user-response.remove_users_success":
    "Selected users have been removed from the notification list.",
  "user-response.remove_users_empty":
    "No users are registered for notifications.",
  "user-response.panel_update_failed":
    "Failed to update the notification list.",

  // ── embed: not_configured ──────────────────────
  "embed.description.not_configured": "Bump reminder is not configured.",

  // ── embed: reset ─────────────────────────────
  "embed.title.reset_confirm": "Confirm Bump Reminder Reset",
  "embed.description.reset_confirm":
    "Are you sure you want to reset bump reminder settings?\nThe following settings will be deleted. This action cannot be undone.",
  "embed.field.name.reset_target": "Targets to Delete",
  "embed.field.value.reset_target":
    "Enabled/Disabled setting / Mention role / Mention users / Pending reminders",

  // ── embed: remove_users ──────────────────────
  "embed.title.remove_users": "Remove Notification Users",
  "embed.description.remove_users": "Select users to remove.",

  // ── embed: config_view ─────────────────────────
  "embed.title.config_view": "Bump Reminder Feature",
  "embed.description.config_view": "Current settings status",

  // ── embed: panel ───────────────────────────────
  "embed.title.panel": "Bump Reminder",

  // ── embed fields ───────────────────────────────
  "embed.field.name.mention_role": "Mention Role",
  "embed.field.name.mention_users": "Mention Users",

  // ── UI labels ──────────────────────────────────
  "ui.button.mention_on": "Turn Notification ON",
  "ui.button.mention_off": "Turn Notification OFF",
  "ui.button.select_all": "Select All",
  "ui.button.submit_delete": "Delete",

  // ── Logs ─────────────────────────────────────
  "log.detected": "bump detected GuildId: {{guildId}} Service: {{service}}",
  "log.detection_failed":
    "failed to handle bump detection GuildId: {{guildId}}",
  "log.panel_mention_updated":
    "mention {{action}} UserId: {{userId}} GuildId: {{guildId}}",
  "log.panel_handle_failed": "Failed to handle panel button",
  "log.panel_reply_failed": "Failed to send error reply for panel button",
  "log.config_enabled": "enabled GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_disabled": "disabled GuildId: {{guildId}}",
  "log.config_mention_set":
    "mention role set GuildId: {{guildId}} RoleId: {{roleId}}",
  "log.config_reset": "settings reset GuildId: {{guildId}}",
  "log.config_mention_removed":
    "mention settings removed GuildId: {{guildId}} Target: {{target}}",
  "log.config_users_removed":
    "mention users removed GuildId: {{guildId}} UserIds: {{userIds}}",
  "log.scheduler_task_failed": "Task failed GuildId: {{guildId}}",
  "log.scheduler_description": "GuildId: {{guildId}} ExecuteAt: {{executeAt}}",
  "log.scheduler_scheduled":
    "Scheduled reminder in {{minutes}} minutes GuildId: {{guildId}}",
  "log.scheduler_cancelling":
    "Cancelling existing reminder GuildId: {{guildId}}",
  "log.scheduler_cancelled": "Reminder cancelled GuildId: {{guildId}}",
  "log.scheduler_executing_immediately":
    "Executing overdue reminder immediately GuildId: {{guildId}}",
  "log.scheduler_restored": "Restored {{count}} pending reminders",
  "log.scheduler_restored_none": "No pending reminders to restore",
  "log.scheduler_sent":
    "Reminder sent GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_send_failed":
    "Reminder send failed GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_channel_not_found":
    "Channel not found GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_disabled": "Disabled GuildId: {{guildId}}",
  "log.scheduler_restore_failed": "Failed to restore:",
  "log.scheduler_duplicates_cancelled":
    "Cancelled {{count}} duplicate reminders",
  "log.scheduler_duplicates_none": "No duplicate reminders to cancel",
  "log.scheduler_unregistered_channel":
    "Skipping unregistered channel GuildId: {{guildId}} ChannelId: {{channelId}} ExpectedChannelId: {{expectedChannelId}}",
  "log.scheduler_orphaned_panel_delete_failed":
    "Failed to delete orphaned panel message PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_deleted":
    "Deleted panel message GuildId: {{guildId}} PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_delete_failed":
    "Failed to delete panel message PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_send_failed": "Failed to send panel",
  "log.database_created":
    "Bump reminder created Id: {{id}} GuildId: {{guildId}}",
  "log.database_create_failed":
    "Failed to create bump reminder GuildId: {{guildId}}",
  "log.database_find_failed": "Failed to find bump reminder Id: {{id}}",
  "log.database_find_all_failed": "Failed to find pending bump reminders",
  "log.database_status_updated":
    "Bump reminder status updated Id: {{id}} Status: {{status}}",
  "log.database_update_failed": "Failed to update bump reminder Id: {{id}}",
  "log.database_deleted": "Bump reminder deleted Id: {{id}}",
  "log.database_delete_failed": "Failed to delete bump reminder Id: {{id}}",
  "log.database_cancelled_by_guild":
    "Cancelled pending bump reminders GuildId: {{guildId}}",
  "log.database_cancelled_by_channel":
    "Cancelled pending bump reminders GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_cancel_failed":
    "Failed to cancel bump reminders GuildId: {{guildId}}",
  "log.database_cleanup_completed":
    "Cleaned up {{count}} old bump reminders older than {{days}} days",
  "log.database_cleanup_failed": "Failed to cleanup old bump reminders:",
} as const;

export type BumpReminderTranslations = typeof bumpReminder;
