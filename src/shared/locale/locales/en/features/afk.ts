// src/shared/locale/locales/en/features/afk.ts
// AFK feature translations (English)
// action-log.* / bulk-confirm.* and the target-related user-response.* keys are used by
// the /afk result Embed and bulk confirmation dialog (shared helpers in src/bot/shared/).
// Moved from the vc namespace when /vc was removed on 2026-09-20 (key names preserved).

export const afk = {
  // ── Command definitions ──────────────────────
  "afk.description": "Move user to AFK channel",
  "afk.target-member.description": "Member to move",
  "afk.target-channel.description":
    "VC whose members will all be moved to the AFK channel",
  "afk-settings.description": "Configure AFK feature (requires Manage Server)",
  "afk-settings.set-channel.description": "Configure AFK channel",
  "afk-settings.set-channel.channel.description": "AFK channel (voice channel)",
  "afk-settings.view.description": "Show current settings",
  "afk-settings.clear-channel.description": "Clear AFK channel setting",

  // ── User responses ───────────────────────────
  "user-response.set_channel_success": "AFK channel configured: {{channel}}",
  "user-response.not_configured":
    "AFK channel is not configured.\nPlease configure a channel with `/afk-settings set-channel` (requires Manage Server).",
  "user-response.channel_not_found":
    "AFK channel not found.\nThe channel may have been deleted.",
  "user-response.invalid_channel_type": "Please specify a voice channel.",
  "user-response.clear_channel_success":
    "AFK channel setting has been cleared.",
  "user-response.target_is_afk":
    "The target VC is the same as the AFK channel.",
  "user-response.target_required":
    "Please specify a target member or voice channel.",
  "user-response.target_conflict":
    "You cannot specify both a member and a voice channel.",
  "user-response.target_not_voice": "Please specify a voice channel.",
  "user-response.member_not_found": "The target member was not found.",
  "user-response.target_not_in_voice":
    "The specified member is not in a voice channel.",
  "user-response.channel_empty": "There is no one in the target VC.",
  "user-response.channel_empty_now":
    "The target VC was empty at execution time.",

  // ── embed: config_view ──────────────────────
  "embed.title.config_view": "AFK",
  "embed.field.name.channel": "AFK Channel",

  // ── action-log: result Embed ─────────────────
  "action-log.title.afk": "AFK Move",
  "action-log.field.invoker": "Invoker",
  "action-log.field.target": "Target",
  "action-log.field.destination": "Destination",
  "action-log.field.failures": "Failures",
  "action-log.failures_more": "and {{count}} more",
  "action-log.desc.afk_individual":
    "Moved <@{{targetId}}> to <#{{destinationId}}>.",
  "action-log.desc.afk_bulk":
    "Moved all members of <#{{channelId}}> to <#{{destinationId}}>.",
  "action-log.audit.afk": "Moved via /afk command",

  // ── bulk-confirm: confirmation dialog for bulk actions ──
  "bulk-confirm.title": "Confirmation",
  "bulk-confirm.description":
    "Execute {{action}} on all members of <#{{channelId}}>. Are you sure?",
  "bulk-confirm.action.afk": "move to the AFK channel",
  "bulk-confirm.field.target": "Target",
  "bulk-confirm.field.destination": "Destination",

  // ── UI labels ────────────────────────────────
  "ui.button.bulk_execute": "Execute",

  // ── Logs ─────────────────────────────────────
  "log.moved":
    "moved user to AFK channel GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}}",
  "log.bulk_executed":
    "executed bulk VC action GuildId: {{guildId}} Action: {{action}} ChannelId: {{channelId}} Count: {{count}} Failures: {{failures}}",
  "log.configured":
    "channel configured GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_cleared": "AFK channel setting cleared GuildId: {{guildId}}",
  "log.database_channel_set":
    "AFK channel set GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_channel_set_failed":
    "Failed to set AFK channel GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_config_saved": "AFK config saved GuildId: {{guildId}}",
  "log.database_config_save_failed":
    "Failed to save AFK config GuildId: {{guildId}}",
} as const;

export type AfkTranslations = typeof afk;
