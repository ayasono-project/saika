// src/shared/locale/locales/en/features/inactiveKick.ts
// Inactive auto-kick feature translations (English)

export const inactiveKick = {
  // ── Audit log reasons (recorded in Discord audit log) ─────
  "audit_reason.reactivated": "Marker role removed due to detected activity",

  // ── Logs ─────────────────────────────────────
  "log.activity_record_failed":
    "Failed to record activity GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_remove_failed":
    "Failed to remove marker role GuildId: {{guildId}} UserId: {{userId}}",
  "log.activity_cleanup_failed":
    "Failed to delete activity record GuildId: {{guildId}} UserId: {{userId}}",
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
