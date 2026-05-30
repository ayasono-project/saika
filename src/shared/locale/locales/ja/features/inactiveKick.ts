// src/shared/locale/locales/ja/features/inactiveKick.ts
// 非アクティブ自動キック機能の翻訳リソース

export const inactiveKick = {
  // ── 監査ログ理由（Discord 監査ログに記録される操作理由）─────
  "audit_reason.reactivated": "再活動を検知したため対象ロールを剥奪",
  "audit_reason.marker_assigned": "非アクティブ警告のため対象ロールを付与",
  "audit_reason.kick": "一定期間非アクティブのため自動キック",

  // ── 段階通知 Embed（事前通知: 1 週間前 / 最終警告）─────
  "embed.title.warn": "⏰ 非アクティブメンバーの自動キック予告",
  "embed.field.name.target_members": "対象メンバー",
  "embed.field.name.kick_schedule": "キック予定",
  "embed.field.value.days_left": "あと {{count}} 日",
  "embed.field.value.soon": "まもなく",
  // 既定の事前通知メッセージ（単一波括弧プレースホルダーを後段で置換）
  "default.warn_message":
    "サーバー「{serverName}」で長期間活動のないメンバーが {count} 名います。あと {daysLeft} 日で自動的にキックされます。引き続き参加される場合は、メッセージの投稿やリアクションなどで活動してください。",

  // ── キック通知 Embed（当日）─────
  "embed.title.kick": "👋 非アクティブメンバーを自動キックしました",
  "embed.field.name.kicked_members": "キックしたメンバー",
  "embed.field.name.test_mode": "テストモード",
  "embed.field.value.test_mode": "（テストモード: 実際にはキックしていません）",
  // 既定のキック通知メッセージ
  "default.kick_message":
    "サーバー「{serverName}」で {thresholdDays} 日以上活動のなかった {count} 名のメンバーを自動的にキックしました。",

  // ── ログ ─────────────────────────────────────
  "log.activity_record_failed":
    "活動記録に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_remove_failed":
    "対象ロールの剥奪に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_assign_failed":
    "対象ロールの付与に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.activity_cleanup_failed":
    "活動履歴の削除に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.daily_check_started": "日次チェック開始",
  "log.daily_check_completed": "日次チェック完了 対象ギルド: {{guildCount}} 件",
  "log.guild_check_failed": "ギルドの日次チェックに失敗 GuildId: {{guildId}}",
  "log.guild_disabled_invalid":
    "設定不正のため自動無効化 GuildId: {{guildId}} 理由: {{reason}}",
  "log.members_fetch_failed": "メンバー取得に失敗 GuildId: {{guildId}}",
  "log.notification_failed":
    "通知送信に失敗 GuildId: {{guildId}} 段階: {{stage}}",
  "log.kicked": "自動キック実行 GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_failed": "キックに失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_skipped_unkickable":
    "キック不能のためスキップ GuildId: {{guildId}} UserId: {{userId}}",
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
