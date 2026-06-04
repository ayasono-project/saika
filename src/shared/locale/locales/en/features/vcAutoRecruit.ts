// src/shared/locale/locales/en/features/vcAutoRecruit.ts
// VC auto recruit feature translations (English)

export const vcAutoRecruit = {
  // ── Command definitions ──────────────────────
  "vc-auto-recruit-settings.description":
    "Configure VC auto recruit feature (requires Manage Server)",
  "vc-auto-recruit-settings.set-channel.description":
    "Set the notification channel",
  "vc-auto-recruit-settings.set-channel.channel.description":
    "Text channel to post recruit messages to",
  "vc-auto-recruit-settings.enable.description":
    "Enable VC auto recruit feature",
  "vc-auto-recruit-settings.disable.description":
    "Disable VC auto recruit feature",
  "vc-auto-recruit-settings.set-message.description":
    "Set a custom recruit message",
  "vc-auto-recruit-settings.clear-message.description":
    "Clear the custom recruit message",
  "vc-auto-recruit-settings.set-embed.description": "Toggle the recruit embed",
  "vc-auto-recruit-settings.set-embed.enabled.description":
    "Whether to include the embed",
  "vc-auto-recruit-settings.add-category.description":
    "Add target categories from a select menu",
  "vc-auto-recruit-settings.remove-category.description":
    "Remove target categories from a select menu",
  "vc-auto-recruit-settings.view.description": "Show current settings",
  "vc-auto-recruit-settings.reset.description":
    "Reset VC auto recruit settings",

  // ── User responses ───────────────────────────
  "user-response.set_channel_success":
    "Notification channel set to {{channel}}",
  "user-response.enable_success": "VC auto recruit feature has been enabled",
  "user-response.enable_error_no_channel":
    "No notification channel is configured. Run /vc-auto-recruit-settings set-channel first.",
  "user-response.disable_success": "VC auto recruit feature has been disabled",
  "user-response.set_message_success": "Recruit message has been set",
  "user-response.clear_message_success": "Recruit message has been cleared",
  "user-response.set_embed_enabled": "Embed has been enabled",
  "user-response.set_embed_disabled": "Embed has been disabled",
  "user-response.text_channel_only": "Please specify a text channel.",
  "user-response.channel_deleted_notice":
    "⚠️ The VC auto recruit notification channel has been deleted.\nSettings have been reset. Please reconfigure with `/vc-auto-recruit-settings set-channel`.",
  "user-response.reset_success": "VC auto recruit settings have been reset.",
  "user-response.reset_cancelled": "Reset has been cancelled.",
  "user-response.categories_added_count":
    "Added {{count}} categories to the recruit targets.",
  "user-response.categories_removed_count":
    "Removed {{count}} categories from the recruit targets.",
  "user-response.no_addable_categories":
    "There are no categories to add. All categories are already registered.",
  "user-response.no_enabled_categories":
    "There are no recruit target categories to remove.",
  "user-response.enable_warning_no_category":
    "Enabled, but no category is enabled so nothing will be posted. Add one with /vc-auto-recruit-settings add-category.",
  "user-response.category_top_label": "TOP (no category)",

  // ── Recruit content ───────────────────────────
  "content.invite_default":
    "A voice call started in {{channel}}. Want to join?",

  // ── Embed: config_view ───────────────────────
  "embed.title.config_view": "VC Auto Recruit",
  "embed.description.not_configured": "VC auto recruit is not configured.",
  "embed.field.name.channel": "Notification Channel",
  "embed.field.name.embed": "Embed",
  "embed.field.name.message": "Custom Message",
  "embed.field.name.categories": "Enabled Categories",
  "embed.field.value.categories_none": "Not set (nothing will be posted)",
  "embed.field.value.top": "TOP (no category)",

  // ── Embed: recruit notification ───────────────
  "embed.title.invite": "🔊 A voice call has started",
  "embed.field.name.invite_channel": "Voice Channel",
  "embed.field.name.invite_starter": "Started by",

  // ── Embed: reset_confirm ─────────────────────
  "embed.title.reset_confirm": "VC Auto Recruit Settings Reset",
  "embed.description.reset_confirm":
    "Reset VC auto recruit settings?\nThe following settings will be deleted. This action cannot be undone.",
  "embed.field.name.reset_target": "Targets",
  "embed.field.value.reset_target":
    "Enabled/Disabled / Notification Channel / Embed Setting / Custom Message / Enabled Categories / Active recruits",

  // ── UI labels ─────────────────────────────────
  "ui.modal.set_message_title": "Set Recruit Message",
  "ui.modal.set_message_label": "Recruit message",
  "ui.modal.set_message_placeholder":
    "Supports {userMention}, {userName}, {channelMention}, {channelName}, {serverName} (max 500 characters)",
  "ui.select.add_category_placeholder":
    "Select categories to add (multiple allowed)",
  "ui.select.remove_category_placeholder":
    "Select categories to remove (multiple allowed)",
  "ui.button.join": "Join VC",
  "ui.button.ended": "Recruitment closed",

  // ── Logs ─────────────────────────────────────
  "log.invite_sent":
    "recruit message sent GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}}",
  "log.invite_skipped_cooldown":
    "recruit skipped by cooldown GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}}",
  "log.invite_closed":
    "recruit closed (VC empty) GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}} MessageId: {{messageId}}",
  "log.invite_close_failed":
    "failed to close recruit GuildId: {{guildId}} MessageId: {{messageId}}",
  "log.startup_cleanup_done":
    "startup cleanup done: closed {{closed}}, removed {{removed}}",
  "log.post_failed": "failed to send recruit message GuildId: {{guildId}}",
  "log.channel_not_found":
    "notification channel not found GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted_config_cleared":
    "channel deleted, config cleared GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_set_channel":
    "channel configured GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_enabled": "enabled GuildId: {{guildId}}",
  "log.config_disabled": "disabled GuildId: {{guildId}}",
  "log.config_message_set": "recruit message set GuildId: {{guildId}}",
  "log.config_message_cleared": "recruit message cleared GuildId: {{guildId}}",
  "log.config_category_added":
    "recruit target category added GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.config_category_removed":
    "recruit target category removed GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.category_removed_by_delete":
    "removed deleted category from enabled list GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.config_embed_set":
    "embed setting changed GuildId: {{guildId}} Enabled: {{enabled}}",
  "log.config_reset": "settings reset GuildId: {{guildId}}",
  "log.voice_state_update_failed":
    "Failed to process voiceStateUpdate (vc-auto-recruit)",
  "log.channel_delete_failed":
    "Failed to sync on channelDelete (vc-auto-recruit)",
  "log.startup_cleanup_failed": "Startup cleanup failed (vc-auto-recruit)",
} as const;

export type VcAutoRecruitTranslations = typeof vcAutoRecruit;
