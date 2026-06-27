// src/shared/locale/locales/ja/features/unverifiedKick.ts
// 未承認ユーザー自動キック機能の翻訳リソース

export const unverifiedKick = {
  // ── コマンド定義 ─────────────────────────────
  "unverified-kick-settings.description":
    "未承認ユーザーの自動キック設定（サーバー管理権限が必要）",
  "unverified-kick-settings.set-verified-role.description":
    "認証ロール（保持していれば対象外）を設定",
  "unverified-kick-settings.set-verified-role.role.description":
    "これを保持していればキック対象外となる認証ロール",
  "unverified-kick-settings.set-grace-days.description":
    "参加からキックまでの猶予日数を設定",
  "unverified-kick-settings.set-grace-days.days.description":
    "猶予日数（1〜30）",
  "unverified-kick-settings.set-warn-days.description":
    "事前警告を送る参加経過日数を設定",
  "unverified-kick-settings.set-warn-days.days.description":
    "参加から何日経過した時点で警告するか（1〜猶予日数-1）",
  "unverified-kick-settings.clear-warn-days.description": "事前警告を無効化",
  "unverified-kick-settings.set-notify-channel.description":
    "キック予告（メンバー/スタッフ向け）の送信チャンネルを設定",
  "unverified-kick-settings.set-notify-channel.channel.description":
    "キック予告を投稿するテキストチャンネル",
  "unverified-kick-settings.clear-notify-channel.description":
    "通知チャンネルを解除",
  "unverified-kick-settings.set-log-channel.description":
    "キック実行・自動無効化の監査ログチャンネルを設定",
  "unverified-kick-settings.set-log-channel.channel.description":
    "監査ログを送信するテキストチャンネル",
  "unverified-kick-settings.clear-log-channel.description":
    "ログチャンネルを解除",
  "unverified-kick-settings.set-marker-role.description":
    "警告対象へ自動付与する対象ロール（通知メンション用）を設定",
  "unverified-kick-settings.set-marker-role.role.description":
    "警告対象へ付与するロール",
  "unverified-kick-settings.clear-marker-role.description":
    "対象ロール連携を解除",
  "unverified-kick-settings.set-dm-message.description":
    "カスタム警告 DM メッセージを設定",
  "unverified-kick-settings.clear-dm-message.description":
    "カスタム警告 DM メッセージを削除",
  "unverified-kick-settings.set-notify-message.description":
    "通知チャンネルのキック予告メッセージを設定",
  "unverified-kick-settings.clear-notify-message.description":
    "通知チャンネルのキック予告メッセージを削除",
  "unverified-kick-settings.enable.description": "自動キック機能を有効化",
  "unverified-kick-settings.disable.description": "自動キック機能を無効化",
  "unverified-kick-settings.preview.description":
    "現在のキック対象・事前警告対象の一覧を表示",
  "unverified-kick-settings.view.description": "現在の設定を表示",
  "unverified-kick-settings.reset.description": "設定をリセット",
  "unverified-kick-settings.exempt.description": "キック除外ロールを管理",
  "unverified-kick-settings.exempt.add.description": "除外ロールを追加",
  "unverified-kick-settings.exempt.add.role.description": "除外するロール",
  "unverified-kick-settings.exempt.remove.description":
    "除外ロールから項目を選んで削除（複数選択可）",
  "unverified-kick-settings.exempt.list.description": "除外ロールを表示",
  "unverified-kick-settings.set-timezone.description":
    "通知・キック実行のタイムゾーンを設定",
  "unverified-kick-settings.set-run-hour.description":
    "通知・キック実行の時刻（時）を設定",
  "unverified-kick-settings.mention.description": "個別メンション通知を管理",
  "unverified-kick-settings.mention.enable.description":
    "個別メンション通知を有効化",
  "unverified-kick-settings.mention.disable.description":
    "個別メンション通知を無効化",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_verified_role_success":
    "認証ロールを {{role}} に設定しました。",
  "user-response.set_grace_days_success":
    "猶予日数を {{days}} 日に設定しました。",
  "user-response.grace_out_of_range":
    "猶予日数は 1〜30 の範囲で指定してください。",
  "user-response.grace_below_warn":
    "猶予日数は警告日数より大きくする必要があります。先に警告日数を下げるか /unverified-kick-settings clear-warn-days を実行してください。",
  "user-response.set_warn_days_success":
    "参加から {{days}} 日経過時点で警告するよう設定しました。",
  "user-response.warn_out_of_range":
    "警告日数は 1 以上かつ猶予日数より小さい値で指定してください。",
  "user-response.clear_warn_days_success": "事前警告を無効化しました。",
  "user-response.text_channel_only": "テキストチャンネルを指定してください。",
  "user-response.channel_bot_permission":
    "そのチャンネルへの送信権限（チャンネルを見る／メッセージを送信／埋め込みリンク）が不足しています。",
  "user-response.set_notify_channel_success":
    "通知チャンネルを {{channel}} に設定しました。",
  "user-response.clear_notify_channel_success":
    "通知チャンネルを解除しました。",
  "user-response.set_log_channel_success":
    "ログチャンネルを {{channel}} に設定しました。",
  "user-response.clear_log_channel_success": "ログチャンネルを解除しました。",
  "user-response.marker_role_bot_permission":
    "対象ロールの付与には Bot に「ロールの管理」権限が必要です。",
  "user-response.set_marker_role_error_hierarchy":
    "そのロールは Bot の最上位ロール以上のため付与できません。Bot ロールより下位のロールを指定してください。",
  "user-response.set_marker_role_success":
    "対象ロールを {{role}} に設定しました。",
  "user-response.clear_marker_role_success": "対象ロール連携を解除しました。",
  "user-response.set_dm_message_success": "警告 DM メッセージを設定しました。",
  "user-response.clear_dm_message_success":
    "警告 DM メッセージを削除しました。",
  "user-response.set_notify_message_success":
    "キック予告メッセージを設定しました。",
  "user-response.clear_notify_message_success":
    "キック予告メッセージを削除しました。",
  "user-response.enable_error_no_verified_role":
    "認証ロールが設定されていません。先に /unverified-kick-settings set-verified-role を実行してください。",
  "user-response.enable_error_no_kick_permission":
    "Bot に「メンバーをキック」権限がありません。権限を付与してから有効化してください。",
  "user-response.enable_success": "自動キック機能を有効化しました。",
  "user-response.disable_success": "自動キック機能を無効化しました。",
  "user-response.exempt_add_success":
    "ロール {{role}} を除外リストに追加しました。",
  "user-response.exempt_add_already": "既に除外リストに登録されています。",
  "user-response.exempt_empty": "除外リストは空です。",
  "user-response.exempt_remove_count":
    "{{count}} 件を除外リストから削除しました。",
  "user-response.reset_success": "設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.disabled_no_verified_role":
    "認証ロールが設定されていないため、自動キックを無効化しました。",
  "user-response.disabled_verified_role_missing":
    "認証ロールが見つからない（削除済み）ため、自動キックを無効化しました。",
  "user-response.disabled_no_kick_permission":
    "Bot に「メンバーをキック」権限がないため、自動キックを無効化しました。",
  "user-response.set_timezone_success":
    "タイムゾーンを {{timezone}} に設定しました。",
  "user-response.set_run_hour_success":
    "実行時刻を {{hour}} 時に設定しました。",
  "user-response.mention_enabled": "個別メンション通知を有効化しました。",
  "user-response.mention_disabled": "個別メンション通知を無効化しました。",

  // ── 設定表示 / リセット Embed ─────
  "embed.title.view": "未承認ユーザー自動キック設定",
  "embed.field.name.verified_role": "認証ロール",
  "embed.field.name.grace_days": "猶予日数",
  "embed.field.name.warn_days": "警告日数",
  "embed.field.name.notify_channel": "通知チャンネル",
  "embed.field.name.log_channel": "ログチャンネル",
  "embed.field.name.marker_role": "対象ロール",
  "embed.field.name.enabled_at": "有効化日時",
  "embed.field.name.dm_message": "警告 DM メッセージ",
  "embed.field.name.notify_message": "キック予告メッセージ",
  "embed.field.name.exempt_roles": "除外ロール",
  "embed.field.name.timezone": "タイムゾーン",
  "embed.field.name.run_hour": "実行時刻",
  "embed.field.name.mention_enabled": "個別メンション通知",
  "embed.field.name.test_mode_status": "テストモード（全体）",
  "embed.field.value.grace_days": "{{count}} 日",
  "embed.field.value.warn_days": "参加から {{count}} 日経過時点",
  "embed.field.value.dm_default": "（未設定・デフォルト文）",
  "embed.field.value.exempt_count": "{{count}} 件",
  "embed.title.reset_confirm": "設定リセット確認",
  "embed.description.reset_confirm":
    "未承認ユーザー自動キックの設定をリセットしますか？この操作は元に戻せません。",
  "embed.field.name.reset_target": "削除対象",
  "embed.field.value.reset_target":
    "有効/無効 / 認証ロール / 猶予日数 / 警告日数 / 通知チャンネル / ログチャンネル / 対象ロール / カスタム DM / 除外ロール / 有効化日時",
  "embed.title.exempt": "除外ロール",

  // ── preview ─────
  "preview.title": "🔍 未承認キック対象プレビュー",
  "preview.none": "現在、キック対象・事前警告対象のメンバーはいません。",
  "preview.section.kick": "キック対象",
  "preview.section.warn": "事前警告対象",
  "preview.entry": "{{user}} — 参加から {{days}} 日経過",

  // ── 監査ログ理由 ─────
  "audit_reason.marker_assigned": "未承認キック警告のため対象ロールを付与",
  "audit_reason.marker_removed_verified": "認証完了のため対象ロールを剥奪",
  "audit_reason.kick":
    "参加から {{days}} 日以内に認証されなかったため自動キック",

  // ── キック予告 Embed（通知チャンネル）─────
  "embed.title.warn": "⏰ 未承認メンバーの自動キック予告",
  "embed.field.name.target_members": "対象メンバー",
  "embed.field.name.kick_schedule": "キック予定日時",

  // ── キックサマリー Embed（ログチャンネル）─────
  "embed.title.kick": "👢 未承認メンバーを自動キックしました",
  "embed.description.kick":
    "認証ロール {{role}} が未取得のためキックしました。",
  "embed.field.name.kicked_members": "キックしたメンバー",
  "embed.field.name.test_mode": "テストモード",
  "embed.field.value.test_mode": "（テストモード: 実際にはキックしていません）",

  // ── 廃止プレースホルダー案内 Embed ─────
  "embed.title.obsolete_notice": "カスタムメッセージの設定変更のお知らせ",
  "embed.description.obsolete_notice":
    "設定中のカスタムメッセージに廃止されたプレースホルダーが含まれています。以下の変更内容をご確認のうえ、カスタムメッセージを更新してください。",
  "embed.field.name.obsolete_marker_role": "{markerRole} の廃止",
  "embed.field.value.obsolete_marker_role":
    "ロールへの一括メンションを廃止し、対象メンバーへの個別メンションに変更しました。\nメンション通知の ON/OFF はコマンドまたはダッシュボードから設定できます。\n・コマンド: /unverified-kick-settings mention enable / disable\n・ダッシュボード: 機能設定 > メンション通知",

  // ── 自動無効化 Embed ─────
  "embed.title.disabled": "⚠️ 未承認ユーザー自動キックを無効化しました",

  // ── 警告 DM デフォルト文（単一波括弧）─────
  "default.dm_message":
    "{serverName} では、参加から {graceDays} 日以内に認証を完了する必要があります。現在まだ認証が完了していないため、このままだと約 {remainingDays} 日後に自動的にサーバーから退出処理されます。サーバー内の案内に従って認証を完了してください。",

  // ── キック予告デフォルト文（通知チャンネル・単一波括弧）─────
  "default.notify_message":
    "参加から {warnDays} 日が経過し、まだ認証が完了していないメンバーが {count} 名います。あと約 {remainingDays} 日で自動的に退出処理されます。お早めに認証を完了してください。",

  // ── UIラベル（セレクト / モーダル）─────
  "ui.select.exempt_remove_placeholder":
    "除外リストから削除するロールを選択（複数選択可）",
  "ui.modal.set_dm_title": "警告 DM メッセージを設定",
  "ui.modal.set_dm_label": "警告 DM メッセージ",
  "ui.modal.set_dm_placeholder":
    "{serverName}, {graceDays}, {warnDays}, {remainingDays} を使用可（最大500文字）",
  "ui.modal.set_notify_title": "キック予告メッセージを設定",
  "ui.modal.set_notify_label": "キック予告メッセージ",
  "ui.modal.set_notify_placeholder":
    "{count}, {serverName}, {graceDays}, {warnDays}, {remainingDays} を使用可（最大500文字）",
  "ui.select.set_timezone_placeholder": "タイムゾーンを選択",
  "ui.select.set_run_hour_placeholder": "実行時刻を選択",

  // ── ログ ─────────────────────────────────────
  "log.config_updated": "設定更新 GuildId: {{guildId}} 操作: {{action}}",
  "log.cron_override":
    "日次チェックのスケジュールを上書き（UNVERIFIED_KICK_CRON）: {{schedule}}",
  "log.cron_invalid":
    "UNVERIFIED_KICK_CRON が不正な cron 式のため既定を使用: {{schedule}}",
  "log.marker_role_remove_failed":
    "対象ロールの剥奪に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_removed_verified":
    "認証完了により対象ロールを剥奪 GuildId: {{guildId}} UserId: {{userId}}",
  "log.marker_role_assign_failed":
    "対象ロールの付与に失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.notification_failed":
    "通知送信に失敗 GuildId: {{guildId}} 段階: {{stage}}",
  "log.kick_skipped_unkickable":
    "キック不能のためスキップ GuildId: {{guildId}} UserId: {{userId}}",
  "log.kicked": "自動キック実行 GuildId: {{guildId}} UserId: {{userId}}",
  "log.kick_failed": "キックに失敗 GuildId: {{guildId}} UserId: {{userId}}",
  "log.guild_disabled_invalid":
    "設定不正のため自動無効化 GuildId: {{guildId}} 理由: {{reason}}",
  "log.members_fetch_failed": "メンバー取得に失敗 GuildId: {{guildId}}",
  "log.daily_check_started": "日次チェック開始",
  "log.daily_check_completed": "日次チェック完了 対象ギルド: {{guildCount}} 件",
  "log.guild_check_failed": "ギルドの日次チェックに失敗 GuildId: {{guildId}}",
} as const;

export type UnverifiedKickTranslations = typeof unverifiedKick;
