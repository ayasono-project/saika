// src/shared/locale/locales/ja/features/inactiveKick.ts
// 非アクティブ自動キック機能の翻訳リソース

export const inactiveKick = {
  // ── コマンド定義 ─────────────────────────────
  "inactive-kick-settings.description":
    "非アクティブメンバーの自動キック設定（サーバー管理権限が必要）",
  "inactive-kick-settings.set-channel.description": "通知チャンネルを設定",
  "inactive-kick-settings.set-channel.channel.description":
    "通知を送信するテキストチャンネル",
  "inactive-kick-settings.set-threshold.description":
    "非アクティブと判定するまでの日数を設定",
  "inactive-kick-settings.set-threshold.days.description":
    "非アクティブ判定日数（14〜365）",
  "inactive-kick-settings.enable.description": "自動キック機能を有効化",
  "inactive-kick-settings.disable.description": "自動キック機能を無効化",
  "inactive-kick-settings.set-week-warn-message.description":
    "1週間前通知のカスタムメッセージを設定",
  "inactive-kick-settings.clear-week-warn-message.description":
    "1週間前通知のカスタムメッセージを削除",
  "inactive-kick-settings.set-final-warn-message.description":
    "最終警告（3日前）のカスタムメッセージを設定",
  "inactive-kick-settings.clear-final-warn-message.description":
    "最終警告（3日前）のカスタムメッセージを削除",
  "inactive-kick-settings.set-kick-message.description":
    "カスタムキック通知メッセージを設定",
  "inactive-kick-settings.clear-kick-message.description":
    "カスタムキック通知メッセージを削除",
  "inactive-kick-settings.set-marker-role.description":
    "警告対象へ自動付与する対象ロールを設定",
  "inactive-kick-settings.set-marker-role.role.description":
    "警告対象へ付与するロール",
  "inactive-kick-settings.clear-marker-role.description":
    "対象ロール連携を解除",
  "inactive-kick-settings.whitelist.description": "キック除外リストを管理",
  "inactive-kick-settings.whitelist.add.description":
    "除外リストにロール／ユーザーを追加",
  "inactive-kick-settings.whitelist.add.role.description": "除外するロール",
  "inactive-kick-settings.whitelist.add.user.description": "除外するユーザー",
  "inactive-kick-settings.whitelist.remove.description":
    "除外リストから項目を選んで削除（複数選択可）",
  "inactive-kick-settings.whitelist.list.description": "除外リストを表示",
  "inactive-kick-settings.set-timezone.description":
    "通知・キック実行のタイムゾーンを設定",
  "inactive-kick-settings.set-run-hour.description":
    "通知・キック実行の時刻（時）を設定",
  "inactive-kick-settings.mention.description": "個別メンション通知を管理",
  "inactive-kick-settings.mention.enable.description":
    "個別メンション通知を有効化",
  "inactive-kick-settings.mention.disable.description":
    "個別メンション通知を無効化",
  "inactive-kick-settings.preview.description":
    "現在のキック対象・通知対象の一覧を表示",
  "inactive-kick-settings.view.description": "現在の設定を表示",
  "inactive-kick-settings.reset.description": "設定をリセット",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_channel_success":
    "通知チャンネルを {{channel}} に設定しました。",
  "user-response.text_channel_only": "テキストチャンネルを指定してください。",
  "user-response.channel_bot_permission":
    "そのチャンネルへの送信権限（チャンネルを見る／メッセージを送信／埋め込みリンク）が不足しています。",
  "user-response.set_threshold_success":
    "非アクティブ判定日数を {{days}} 日に設定しました。",
  "user-response.threshold_out_of_range":
    "日数は 14〜365 の範囲で指定してください。",
  "user-response.enable_success": "自動キック機能を有効化しました。",
  "user-response.enable_error_no_channel":
    "通知チャンネルが設定されていません。先に /inactive-kick-settings set-channel を実行してください。",
  "user-response.disable_success": "自動キック機能を無効化しました。",
  "user-response.set_week_warn_message_success":
    "1週間前通知のメッセージを設定しました。",
  "user-response.clear_week_warn_message_success":
    "1週間前通知のメッセージを削除しました。",
  "user-response.set_final_warn_message_success":
    "最終警告のメッセージを設定しました。",
  "user-response.clear_final_warn_message_success":
    "最終警告のメッセージを削除しました。",
  "user-response.set_kick_message_success":
    "キック通知メッセージを設定しました。",
  "user-response.clear_kick_message_success":
    "キック通知メッセージを削除しました。",
  "user-response.set_marker_role_success":
    "対象ロールを {{role}} に設定しました。",
  "user-response.set_marker_role_error_hierarchy":
    "そのロールは Bot の最上位ロール以上のため付与できません。Bot ロールより下位のロールを指定してください。",
  "user-response.marker_role_bot_permission":
    "対象ロールの付与には Bot に「ロールの管理」権限が必要です。",
  "user-response.clear_marker_role_success": "対象ロール連携を解除しました。",
  "user-response.whitelist_requires_target":
    "ロールまたはユーザーのいずれかを指定してください。",
  "user-response.whitelist_add_role_success":
    "ロール {{role}} を除外リストに追加しました。",
  "user-response.whitelist_add_user_success":
    "ユーザー {{user}} を除外リストに追加しました。",
  "user-response.whitelist_add_already": "既に除外リストに登録されています。",
  "user-response.whitelist_empty": "除外リストは空です。",
  "user-response.whitelist_remove_count":
    "{{count}} 件を除外リストから削除しました。",
  "user-response.set_timezone_success":
    "タイムゾーンを {{timezone}} に設定しました。",
  "user-response.set_run_hour_success":
    "実行時刻を {{hour}} 時に設定しました。",
  "user-response.mention_enabled": "個別メンション通知を有効化しました。",
  "user-response.mention_disabled": "個別メンション通知を無効化しました。",
  "user-response.reset_success": "設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.channel_deleted_notice":
    "⚠️ 自動キックの通知チャンネルが削除されたため、機能を無効化しました。",

  // ── 設定表示 / リセット Embed ─────
  "embed.title.view": "非アクティブ自動キック設定",
  "embed.field.name.channel": "通知チャンネル",
  "embed.field.name.threshold": "非アクティブ判定日数",
  "embed.field.name.enabled_at": "有効化日時",
  "embed.field.name.marker_role": "対象ロール",
  "embed.field.name.week_warn_message": "1週間前通知メッセージ",
  "embed.field.name.final_warn_message": "最終警告メッセージ",
  "embed.field.name.kick_message": "キック通知メッセージ",
  "embed.field.name.whitelist": "除外リスト",
  "embed.field.name.timezone": "タイムゾーン",
  "embed.field.name.run_hour": "実行時刻",
  "embed.field.name.mention_enabled": "個別メンション通知",
  "embed.field.value.threshold_days": "{{count}} 日",
  "embed.field.value.whitelist_counts":
    "ロール {{roles}} 件 / ユーザー {{users}} 件",
  "embed.field.value.message_default_prefix": "（未設定・デフォルト文）",
  "embed.field.value.kick_message_unset": "未設定（本文なし・Embed のみ）",
  "embed.field.name.test_mode_status": "テストモード（全体）",
  "embed.title.reset_confirm": "設定リセット確認",
  "embed.description.reset_confirm":
    "非アクティブ自動キックの設定をリセットしますか？この操作は元に戻せません（活動履歴は保持されます）。",
  "embed.field.name.reset_target": "削除対象",
  "embed.field.value.reset_target":
    "有効/無効 / 通知チャンネル / しきい値 / 各カスタムメッセージ / 対象ロール / 除外リスト / 有効化日時",
  "embed.title.whitelist": "除外リスト",
  "embed.field.name.whitelist_roles": "除外ロール",
  "embed.field.name.whitelist_users": "除外ユーザー",

  // ── preview ─────
  "preview.title": "🔍 自動キック対象プレビュー",
  "preview.none": "現在、キック対象・通知対象のメンバーはいません。",
  "preview.section.kick": "キック対象",
  "preview.section.final": "最終警告対象",
  "preview.section.week": "1 週間前通知対象",
  "preview.entry": "{{user}} — {{days}} 日非アクティブ",

  // ── 監査ログ理由 ─────
  "audit_reason.reactivated": "再活動を検知したため対象ロールを剥奪",
  "audit_reason.marker_assigned": "非アクティブ警告のため対象ロールを付与",
  "audit_reason.kick": "一定期間非アクティブのため自動キック",

  // ── 段階通知 Embed（事前通知: 1 週間前 / 最終警告）─────
  "embed.title.warn": "⏰ 非アクティブメンバーの自動キック予告",
  "embed.field.name.target_members": "対象メンバー",
  "embed.field.name.kick_schedule": "キック予定日時",
  "default.week_warn_message":
    "サーバー「{serverName}」で長期間活動のないメンバーが {count} 名います。このままだと自動的にキックされます。キック予定日時は通知内に表示されます。引き続き参加される場合は、メッセージの投稿やリアクションなどで活動してください。",
  "default.final_warn_message":
    "【最終警告】サーバー「{serverName}」で活動のないメンバー {count} 名がキック対象です。退出を避けるには、今のうちにメッセージの投稿やリアクションで活動してください。キック予定日時は通知内に表示されます。",

  // ── キック通知 Embed（当日）─────
  "embed.title.kick": "👋 非アクティブメンバーを自動キックしました",
  "embed.field.name.kicked_members": "キックしたメンバー",
  "embed.field.name.test_mode": "テストモード",
  "embed.field.value.test_mode": "（テストモード: 実際にはキックしていません）",

  // ── 廃止プレースホルダー案内 Embed ─────
  "embed.title.obsolete_notice": "カスタムメッセージの設定変更のお知らせ",
  "embed.description.obsolete_notice":
    "設定中のカスタムメッセージに廃止されたプレースホルダーが含まれています。以下の変更内容をご確認のうえ、カスタムメッセージを更新してください。",
  "embed.field.name.obsolete_marker_role": "{markerRole} の廃止",
  "embed.field.value.obsolete_marker_role":
    "ロールへの一括メンションを廃止し、対象メンバーへの個別メンションに変更しました。\nメンション通知の ON/OFF はコマンドまたはダッシュボードから設定できます。\n・コマンド: /inactive-kick-settings mention enable / disable\n・ダッシュボード: 機能設定 > メンション通知",
  "embed.field.name.obsolete_days_left": "{daysLeft} の廃止",
  "embed.field.value.obsolete_days_left":
    "残日数プレースホルダーを廃止しました。\nキック予定日時はユーザーごとに通知 embed に表示されます。",

  // ── UIラベル（セレクト / モーダル）─────
  "ui.select.whitelist_remove_placeholder":
    "除外リストから削除する項目を選択（複数選択可）",
  "ui.modal.set_week_warn_message_title": "1週間前通知メッセージを設定",
  "ui.modal.set_week_warn_message_label": "1週間前通知メッセージ",
  "ui.modal.set_final_warn_message_title": "最終警告メッセージを設定",
  "ui.modal.set_final_warn_message_label": "最終警告メッセージ",
  "ui.modal.set_warn_message_placeholder":
    "{count}, {thresholdDays}, {serverName} を使用可（最大500文字）",
  "ui.modal.set_kick_message_title": "キック通知メッセージを設定",
  "ui.modal.set_kick_message_label": "キック通知メッセージ",
  "ui.modal.set_kick_message_placeholder":
    "{count}, {thresholdDays}, {serverName} を使用可（最大500文字）",
  "ui.select.set_timezone_placeholder": "タイムゾーンを選択",
  "ui.select.set_run_hour_placeholder": "実行時刻を選択",

  // ── ログ ─────────────────────────────────────
  "log.activity_record_failed":
    "活動記録に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_remove_failed":
    "対象ロールの剥奪に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_assign_failed":
    "対象ロールの付与に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.activity_cleanup_failed":
    "活動履歴の削除に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.cron_override":
    "日次チェックのスケジュールを上書き（INACTIVE_KICK_CRON）: {{schedule}}",
  "log.cron_invalid":
    "INACTIVE_KICK_CRON が不正な cron 式のため既定を使用: {{schedule}}",
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
  "log.config_updated": "設定更新 GuildId: {{guildId}} 操作: {{action}}",
} as const;

export type InactiveKickTranslations = typeof inactiveKick;
