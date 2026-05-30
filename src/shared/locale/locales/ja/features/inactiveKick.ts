// src/shared/locale/locales/ja/features/inactiveKick.ts
// 非アクティブ自動キック機能の翻訳リソース

export const inactiveKick = {
  // ── 監査ログ理由（Discord 監査ログに記録される操作理由）─────
  "audit_reason.reactivated": "再活動を検知したため対象ロールを剥奪",

  // ── ログ ─────────────────────────────────────
  "log.activity_record_failed":
    "活動記録に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_remove_failed":
    "対象ロールの剥奪に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.activity_cleanup_failed":
    "活動履歴の削除に失敗 GuildId: {{guildId}} UserId: {{userId}}",
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
