// src/shared/locale/locales/en/features/messageDelete.ts
// Message Delete feature translations (English)

export const messageDelete = {
  // ── Command definitions ──────────────────────
  "message-delete.description":
    "Bulk delete messages (default: all channels in server)",
  "message-delete.count.description":
    "Number of messages to delete (1–1000, defaults to 1000 if omitted)",
  "message-delete.user.description":
    "Target user ID or mention (for webhooks, paste the user ID directly)",
  "message-delete.keyword.description":
    "Delete messages containing this keyword (case-insensitive partial match)",
  "message-delete.days.description":
    "Delete only messages from the past N days (1–366, cannot combine with after/before)",
  "message-delete.after.description":
    "Delete only messages after this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)",
  "message-delete.before.description":
    "Delete only messages before this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)",
  "message-delete.channel.description":
    "Restrict deletion to a specific channel (default: entire server)",

  // ── UI labels ──────────────────────────────────
  "ui.button.scan_cancel": "Preview Collected",
  "ui.button.delete": "Delete ({{count}})",
  "ui.select.exclude_placeholder": "Select messages to exclude from this page",
  "ui.select.exclude_no_messages": "(no messages)",
  "ui.button.deletion_confirm": "Delete ({{count}})",
  "ui.button.deletion_back": "Go back",
  "ui.button.deletion_cancel": "Cancel",
  "ui.button.days_set": "Past {{days}} days",
  "ui.button.days_empty": "Enter past N days",
  "ui.button.after_date_set": "after: {{date}}",
  "ui.button.after_date_empty": "Enter after date",
  "ui.button.before_date_set": "before: {{date}}",
  "ui.button.before_date_empty": "Enter before date",
  "ui.button.keyword": "Search by content",
  "ui.button.keyword_set": "{{keyword}}",
  "ui.button.reset": "Reset",
  "ui.select.author_placeholder": "Filter by author",
  "ui.select.author_all": "(All authors)",
  "ui.modal.keyword_title": "Filter by Content",
  "ui.modal.keyword_label": "Keyword",
  "ui.modal.keyword_placeholder": "Enter keyword to filter",
  "ui.modal.days_title": "Filter by Past N Days",
  "ui.modal.days_label": "Number of days (positive integer)",
  "ui.modal.days_placeholder": "e.g. 7",
  "ui.modal.after_title": "Filter by After Date",
  "ui.modal.after_label": "Start date/time",
  "ui.modal.after_placeholder": "e.g. 2026-01-01 or 2026-01-01T00:00:00",
  "ui.modal.before_title": "Filter by Before Date",
  "ui.modal.before_label": "End date/time",
  "ui.modal.before_placeholder": "e.g. 2026-02-28 or 2026-02-28T23:59:59",
  "ui.modal.jump_title": "Jump to Page",
  "ui.modal.jump_label": "Page number",
  "ui.modal.jump_placeholder": "Integer from 1 to {{total}}",
  "ui.modal.webhook_title": "Enter Webhook ID",
  "ui.modal.webhook_label": "Webhook ID (17-20 digit number)",
  "ui.modal.webhook_placeholder": "123456789012345678",
  "ui.select.condition_user_placeholder": "Select users",
  "ui.select.condition_channel_placeholder": "Select channels",
  "ui.button.start_scan": "Start Scan",
  "ui.button.webhook_input": "Enter Webhook ID",
  "ui.button.condition_cancel": "Cancel",

  // ── Embed ─────────────────────────────────────
  "embed.title.confirm": "Messages to Delete",
  "embed.title.deletion_confirm": "🗑️ Are you sure?",
  "embed.description.deletion_warning": "⚠️ **This action cannot be undone**",
  "embed.description.deletion_confirm":
    "The following messages will be deleted (total: {{count}})",
  "embed.title.summary": "Deletion Complete",
  "embed.field.name.total_deleted": "Total Deleted",
  "embed.field.value.total_deleted": "{{count}}",
  "embed.field.name.channel_breakdown": "By Channel",
  "embed.field.value.channel_breakdown_item": "<#{{channelId}}>: {{count}}",
  "embed.field.value.breakdown_empty": "—",
  "embed.title.conditions": "📋 Command Conditions",
  "embed.field.value.count_limited": "{{count}}",
  "embed.field.value.count_unlimited": "(no limit: {{count}})",
  "embed.field.value.user_all": "(all users)",
  "embed.field.value.none": "(none)",
  "embed.field.value.channel_all": "(entire server)",
  "embed.field.value.days_value": "Past {{days}} days",
  "embed.field.value.after_value": "After {{date}}",
  "embed.field.value.before_value": "Before {{date}}",
  "embed.title.condition_step": "Select target users and channels (optional)",
  "embed.field.value.empty_content": "*(no content)*",
  "embed.field.value.attachments": "📎 {{count}} attachment(s)",
  "embed.field.value.embed_no_title": "🔗 Embedded content",
  "embed.field.value.jump_to_message": "↗ Jump to message",

  // ── User responses ─────────────────────────────
  "user-response.user_invalid_format":
    "Invalid `user` format. Enter a user ID or mention (e.g. `<@123456789>`).",
  "user-response.no_filter":
    "No filter condition specified. Please provide at least one of: `count`, `user`, `keyword`, `days`, `after`, `before`.",
  "user-response.days_and_date_conflict":
    "`days` cannot be combined with `after`/`before`. Use one or the other.",
  "user-response.after_invalid_format":
    "Invalid `after` date format. Use `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`.",
  "user-response.before_invalid_format":
    "Invalid `before` date format. Use `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`.",
  "user-response.date_range_invalid": "`after` must be earlier than `before`.",
  "user-response.no_permission":
    "You do not have permission to perform this action.\nRequired permission: Manage Messages",
  "user-response.bot_no_permission":
    "The bot lacks the required permissions to perform this action.\nRequired: Manage Messages, Read Message History, View Channel\nPlease contact a server administrator to check the bot's permission settings.",
  "user-response.text_channel_only": "Please specify a text channel.",
  "user-response.no_messages_found": "No deletable messages were found.",
  "user-response.delete_failed": "An error occurred while deleting messages.",
  "user-response.scan_failed": "An error occurred while scanning messages.",
  "user-response.not_authorized": "You are not authorized to do this.",
  "user-response.jump_invalid_page":
    "Page number must be an integer from 1 to {{total}}",
  "user-response.days_invalid_value":
    "Please enter a positive integer for the number of days.",
  "user-response.after_future":
    "Please specify a past date/time for `after`. (Today's date is valid.)",
  "user-response.before_future":
    "Please specify a past date/time for `before`. (Today's date is valid.)",
  "user-response.locked":
    "A message-delete command is already running on this server. Please try again after it completes.",
  "user-response.channel_no_access":
    "Cannot access the specified channel.\nThe bot requires ReadMessageHistory and ManageMessages permissions.\nPlease contact a server administrator to check the bot's permission settings.",
  "user-response.webhook_invalid_format":
    "Invalid Webhook ID format. Please enter a 17-20 digit number.",
  "user-response.channel_partial_skip":
    "Skipped channels due to insufficient bot permissions: {{channels}}\nPlease contact a server administrator to check the bot's permission settings.",
  "user-response.channel_all_no_access":
    "Cannot access specified channels.\nThe bot requires ReadMessageHistory and ManageMessages permissions.\nPlease contact a server administrator to check the bot's permission settings.",
  "user-response.scan_progress":
    "Scanning... {{totalScanned}} fetched\nSearching for targets... {{collected}} / {{limit}}",
  "user-response.delete_progress": "Deleting... {{totalDeleted}} / {{total}}",
  "user-response.delete_progress_channel":
    "<#{{channelId}}>: {{deleted}} / {{total}}",
  "user-response.zero_targets": "No messages left to delete",
  "user-response.cancelled": "Deletion cancelled.",
  "user-response.timed_out": "Timed out. Please run the command again.",
  "user-response.scan_timed_out":
    "Scan timed out. Showing preview with collected messages.",
  "user-response.scan_timed_out_empty":
    "Scan timed out. No deletable messages were found.",
  "user-response.delete_timed_out":
    "Deletion timed out. Messages deleted: {{count}}",
  "user-response.condition_step_timeout":
    "Condition setup timed out. Please run the command again.",
  "user-response.condition_step_no_filter":
    "No filter conditions specified.\nPlease specify at least one of: `count`, `keyword`, `days`, `after`, `before`, or select target users.",

  // ── Logs ─────────────────────────────────────
  "log.cmd_all_channels_start": "fetching all channels",
  "log.cmd_channel_count": "channel count={{count}}",
  "log.svc_scan_start":
    "scan start channels={{channelCount}} count={{count}} targetUserIds={{targetUserIds}}",
  "log.svc_initial_fetch": "initial fetch ch={{channelId}}",
  "log.svc_refill": "refill ch={{channelId}} before={{lastId}}",
  "log.svc_scan_complete": "scan complete total={{count}}",
  "log.svc_channel_no_access": "channel {{channelId}} skipped (no access)",
  "log.svc_bulk_delete_chunk": "bulkDelete chunk size={{size}}",
  "log.svc_message_delete_failed":
    "failed to delete messageId={{messageId}}: {{error}}",
  "log.scan_error": "scan error: {{error}}",
  "log.delete_error": "delete error: {{error}}",
  "log.deleted":
    "{{userId}} deleted {{count}} messages{{countPart}}{{targetPart}}{{keywordPart}}{{periodPart}} channels=[{{channels}}]",
  "log.lock_acquired": "lock acquired: guild={{guildId}}",
  "log.lock_released": "lock released: guild={{guildId}}",
  "log.cancel_collector_ended": "Scan cancelCollector ended: reason={{reason}}",
  "log.aborting_non_user_end": "Aborting scan due to non-user end",
} as const;

export type MessageDeleteTranslations = typeof messageDelete;
