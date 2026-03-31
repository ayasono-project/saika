// src/shared/locale/locales/en/features/stickyMessage.ts
// Sticky Message feature translations (English)

export const stickyMessage = {
  // ── Command definitions ──────────────────────
  "sticky-message.description":
    "Manage sticky messages (pinned to channel bottom) — requires Manage Channels",
  "sticky-message.set.description": "Set a sticky message (modal input)",
  "sticky-message.set.channel.description":
    "Text channel to set the sticky message in (defaults to this channel)",
  "sticky-message.set.style.description":
    "Display style (text: plain text / embed: embed; defaults to text)",
  "sticky-message.remove.description": "Remove sticky messages",
  "sticky-message.view.description":
    "View sticky message settings (channel select UI)",
  "sticky-message.update.description":
    "Update the content of an existing sticky message (modal input)",
  "sticky-message.update.channel.description":
    "Channel whose sticky message to update (defaults to this channel)",
  "sticky-message.update.style.description":
    "Display style (text: plain text / embed: embed; defaults to text)",

  // ── Choice names ──────────────────────────────
  "choice.style.text": "Text",
  "choice.style.embed": "Embed",

  // ── User responses ─────────────────────────────
  "user-response.set_success": "Sticky message has been set.",
  "user-response.already_exists":
    "A sticky message is already configured for this channel. Remove it first before setting a new one.",
  "user-response.remove_no_selection": "Please select channels to remove.",
  "user-response.remove_success": "Removed {{count}} sticky message(s).",
  "user-response.remove_not_found": "No sticky messages are configured.",
  "user-response.view_empty":
    "No sticky messages are configured for any channel.",
  "user-response.update_success": "Sticky message has been updated.",
  "user-response.permission_denied":
    "You do not have permission to do this. Manage Channels permission is required.",
  "user-response.empty_message": "Please enter a message.",
  "user-response.text_channel_only":
    "Sticky messages can only be set in text channels.",
  "user-response.operation_failed":
    "An error occurred while managing the sticky message.",

  // ── Embed ─────────────────────────────────────
  "embed.title.set_success": "Done",
  "embed.title.already_exists": "Warning",
  "embed.title.remove_success": "Removed",
  "embed.title.remove_not_found": "Not Found",
  "embed.title.view": "Sticky Message Settings",
  "embed.title.view_not_found": "Not Configured",
  "embed.title.update_success": "Updated",
  "embed.title.update_not_found": "Not Configured",
  "embed.field.name.removed_channels": "Removed channels",
  "embed.field.name.channel": "Channel",
  "embed.field.name.format": "Format",
  "embed.field.value.format_plain": "Plain text",
  "embed.field.value.format_embed": "Embed",
  "embed.field.name.updated_at": "Last updated",
  "embed.field.name.updated_by": "Set by",
  "embed.field.name.content": "Message content",
  "embed.field.name.embed_title": "Embed title",
  "embed.field.name.embed_color": "Embed color",

  // ── UI labels ──────────────────────────────────
  "ui.modal.set_title": "Enter sticky message content",
  "ui.modal.set_message_label": "Message content",
  "ui.modal.set_message_placeholder":
    "Supports multiple lines (max 2000 characters)",
  "ui.modal.set_embed_title": "Set embed sticky message",
  "ui.modal.set_embed_title_label": "Title",
  "ui.modal.set_embed_title_placeholder": "Embed title (optional)",
  "ui.modal.set_embed_description_label": "Description",
  "ui.modal.set_embed_description_placeholder":
    "Embed body text (leave blank for none)",
  "ui.modal.set_embed_color_label": "Color code (optional)",
  "ui.modal.set_embed_color_placeholder":
    "#008969 or 0x008969 (default: #008969)",
  "ui.select.remove_placeholder": "Select channels to remove (multiple)",
  "ui.button.remove": "Remove",
  "ui.select.view_placeholder": "Select a channel",
  "ui.modal.update_title": "Update sticky message",
  "ui.modal.update_message_label": "Message content",
  "ui.modal.update_message_placeholder":
    "Supports multiple lines (max 2000 characters)",
  "ui.modal.update_embed_title": "Update embed sticky message",

  // ── Logs ─────────────────────────────────────
  "log.channel_delete_cleanup":
    "Cleaned up on channel delete ChannelId: {{channelId}}",
  "log.channel_delete_cleanup_failed":
    "Failed to delete record on channel delete ChannelId: {{channelId}}",
  "log.create_handler_error":
    "messageCreate handler error ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.resend_scheduled_error": "Resend scheduled error",
  "log.send_failed":
    "Failed to send message ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.previous_deleted_or_not_found":
    "Previous message already deleted or not found ChannelId: {{channelId}}",
  "log.set_failed":
    "Failed to set via modal ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.set_embed_failed":
    "Failed to set via embed modal ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.update_failed":
    "Failed to update via modal ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.update_embed_failed":
    "Failed to update via embed modal ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.resend_after_update_failed":
    "Failed to resend after update ChannelId: {{channelId}}",
  "log.resend_after_embed_update_failed":
    "Failed to resend after embed update ChannelId: {{channelId}}",
  "log.database_find_by_channel_failed":
    "Failed to find sticky message ChannelId: {{channelId}}",
  "log.database_find_all_by_guild_failed":
    "Failed to find all sticky messages GuildId: {{guildId}}",
  "log.database_create_failed":
    "Failed to create sticky message GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_update_last_message_id_failed":
    "Failed to update sticky message lastMessageId Id: {{id}}",
  "log.database_update_content_failed":
    "Failed to update sticky message content Id: {{id}}",
  "log.database_delete_failed": "Failed to delete sticky message Id: {{id}}",
  "log.database_delete_by_channel_failed":
    "Failed to delete sticky message by channel ChannelId: {{channelId}}",
} as const;

export type StickyMessageTranslations = typeof stickyMessage;
