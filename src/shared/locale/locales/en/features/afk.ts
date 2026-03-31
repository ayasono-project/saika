// src/shared/locale/locales/en/features/afk.ts
// AFK feature translations (English)

export const afk = {
  // ── Command definitions ──────────────────────
  "afk.description": "Move user to AFK channel",
  "afk.user.description": "User to move (default: yourself)",
  "afk-config.description": "Configure AFK feature (requires Manage Server)",
  "afk-config.set-channel.description": "Configure AFK channel",
  "afk-config.set-channel.channel.description": "AFK channel (voice channel)",
  "afk-config.view.description": "Show current settings",
  "afk-config.clear-channel.description": "Clear AFK channel setting",

  // ── User responses ───────────────────────────
  "user-response.moved": "Moved {{user}} to {{channel}}",
  "user-response.set_channel_success": "AFK channel configured: {{channel}}",
  "user-response.not_configured":
    "AFK channel is not configured.\nPlease configure a channel with `/afk-config set-channel` (requires Manage Server).",
  "user-response.member_not_found": "User not found.",
  "user-response.user_not_in_voice":
    "The specified user is not in a voice channel.",
  "user-response.channel_not_found":
    "AFK channel not found.\nThe channel may have been deleted.",
  "user-response.invalid_channel_type": "Please specify a voice channel.",
  "user-response.clear_channel_success":
    "AFK channel setting has been cleared.",

  // ── embed: config_view ──────────────────────
  "embed.title.config_view": "AFK",
  "embed.field.name.channel": "AFK Channel",

  // ── Logs ─────────────────────────────────────
  "log.moved":
    "moved user to AFK channel GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}}",
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
