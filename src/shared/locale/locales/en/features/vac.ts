// src/shared/locale/locales/en/features/vac.ts
// VAC (Voice Auto-Create) feature translations (English)

export const vac = {
  // ── Command definitions ──────────────────────
  "vac-config.description":
    "Configure voice auto-create feature (Manage Server)",
  "vac-config.create-trigger-vc.description": "Create trigger channel",
  "vac-config.create-trigger-vc.category.description":
    "Destination category (TOP or category; defaults to current category)",
  "vac-config.remove-trigger-vc.description": "Remove trigger channel",
  "vac-config.remove-trigger-vc.category.description":
    "Target category (TOP or category; defaults to current category)",
  "vac-config.remove-trigger-vc.category.top": "TOP (no category)",
  "vac-config.view.description": "Show current settings",

  // ── User responses ───────────────────────────
  "user-response.trigger_created": "Created trigger channel {{channel}}",
  "user-response.trigger_removed": "Removed trigger channel {{channel}}",
  "user-response.triggers_removed": "Removed {{count}} trigger channel(s).",
  "user-response.renamed": "VC name has been changed to {{name}}",
  "user-response.limit_changed": "User limit has been set to {{limit}}",
  "user-response.members_moved": "Moved to {{channel}}.",
  "user-response.panel_refreshed": "Panel moved to the bottom",
  "user-response.unlimited": "unlimited",
  "user-response.not_configured":
    "Voice auto-create feature is not configured.",
  "user-response.trigger_not_found":
    "There is no trigger channel in the specified category.",
  "user-response.already_exists": "A trigger channel already exists.",
  "user-response.category_full": "The category has reached the channel limit.",
  "user-response.no_permission":
    "Missing permission to create or edit channels.",
  "user-response.not_in_vc":
    "Only users currently in this VC can use this action.",
  "user-response.not_in_any_vc": "This command can only be used while in a VC.",
  "user-response.not_vac_channel":
    "This VC is not managed by auto-create feature.",
  "user-response.name_required": "Please enter a VC name.",
  "user-response.limit_out_of_range": "User limit must be between 0 and 99.",
  "user-response.afk_move_failed":
    "Failed to move to AFK channel. The target user(s) may have left the VC.",

  // ── embed: remove_error ────────────────────────
  "embed.title.remove_error": "Removal Error",

  // ── embed: config_view ─────────────────────────
  "embed.title.config_view": "Voice Auto-Create",
  "embed.field.name.trigger_channels": "Trigger channels",
  "embed.field.name.created_vcs": "Created VC count",
  "embed.field.name.created_vc_details": "Created VCs",
  "embed.field.value.no_created_vcs": "None",
  "embed.field.value.top": "TOP",

  // ── embed: panel ───────────────────────────────
  "embed.title.panel": "Voice Channel Control Panel",
  "embed.description.panel": "You can change VC settings from this panel.",

  // ── UI labels ──────────────────────────────────
  "ui.select.trigger_remove_placeholder":
    "Select trigger channels to remove (multiple)",
  "ui.button.trigger_remove_confirm": "Delete",
  "ui.button.rename": "Change VC Name",
  "ui.button.limit": "Change User Limit",
  "ui.modal.limit_placeholder": "0–99 (0: unlimited)",
  "ui.button.afk": "Move Members to AFK",
  "ui.button.refresh": "Move Panel to Bottom",

  // ── Logs ─────────────────────────────────────
  "log.startup_cleanup_stale_trigger_removed":
    "Startup cleanup: removed stale trigger channel GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_orphaned_channel_removed":
    "Startup cleanup: removed orphaned VAC channel from DB GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_empty_channel_deleted":
    "Startup cleanup: deleted empty VAC channel GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_done":
    "Startup cleanup done: removed {{removedTriggers}} triggers and {{removedChannels}} channels",
  "log.startup_cleanup_done_none":
    "Startup cleanup done No inconsistencies found",
  "log.voice_state_update_failed": "Failed to process voiceStateUpdate",
  "log.channel_created":
    "channel created GuildId: {{guildId}} ChannelId: {{channelId}} OwnerId: {{ownerId}}",
  "log.channel_deleted":
    "channel deleted GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.category_full":
    "category reached channel limit GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.category_full_action":
    "VC creation blocked due to category channel limit",
  "log.trigger_removed_by_delete":
    "removed deleted trigger channel from config GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_delete_sync_failed": "Failed to sync config on channelDelete",
  "log.channel_create_failed":
    "Failed to create VC channel due to missing bot permissions GuildId: {{guildId}}",
  "log.panel_send_failed": "Failed to send control panel",
  "log.startup_cleanup_failed": "Startup cleanup failed",
  "log.database_trigger_added":
    "VAC trigger channel added GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_add_failed":
    "Failed to add VAC trigger channel GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_removed":
    "VAC trigger channel removed GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_remove_failed":
    "Failed to remove VAC trigger channel GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_channel_registered":
    "VAC managed channel registered GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_register_failed":
    "Failed to register VAC managed channel GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_unregistered":
    "VAC managed channel unregistered GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_unregister_failed":
    "Failed to unregister VAC managed channel GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
} as const;

export type VacTranslations = typeof vac;
