// src/shared/locale/locales/en/features/inactiveKick.ts
// Inactive auto-kick feature translations (English)

export const inactiveKick = {
  // ── Audit log reasons (recorded in Discord audit log) ─────
  "audit_reason.reactivated": "Marker role removed due to detected activity",
  "audit_reason.marker_assigned": "Marker role added for inactivity warning",
  "audit_reason.kick": "Auto-kicked for prolonged inactivity",

  // ── Staged warning embed (advance notice: 1 week / final) ─────
  "embed.title.warn": "⏰ Inactive member auto-kick notice",
  "embed.field.name.target_members": "Target members",
  "embed.field.name.kick_schedule": "Scheduled kick",
  "embed.field.value.days_left": "in {{count}} day(s)",
  "embed.field.value.soon": "soon",
  // Default advance-notice message (single-brace placeholders substituted later)
  "default.warn_message":
    'There are {count} member(s) inactive for a long time on "{serverName}". They will be automatically kicked in {daysLeft} day(s). To stay, please be active by posting a message or adding a reaction.',

  // ── Kick notification embed (on the day) ─────
  "embed.title.kick": "👋 Inactive members were auto-kicked",
  "embed.field.name.kicked_members": "Kicked members",
  "embed.field.name.test_mode": "Test mode",
  "embed.field.value.test_mode": "(Test mode: no one was actually kicked)",
  // Default kick notification message
  "default.kick_message":
    'Automatically kicked {count} member(s) who had been inactive for {thresholdDays}+ days on "{serverName}".',

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
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
