// src/shared/locale/locales/ja/features/memberLog.ts
// メンバーログ機能の翻訳リソース

export const memberLog = {
  // ── コマンド定義 ─────────────────────────────
  "member-log-config.description":
    "メンバーログ機能の設定（サーバー管理権限が必要）",
  "member-log-config.set-channel.description": "通知チャンネルを設定",
  "member-log-config.set-channel.channel.description":
    "通知を送信するテキストチャンネル",
  "member-log-config.enable.description": "メンバーログ機能を有効化",
  "member-log-config.disable.description": "メンバーログ機能を無効化",
  "member-log-config.set-join-message.description":
    "カスタム参加メッセージを設定",
  "member-log-config.set-leave-message.description":
    "カスタム退出メッセージを設定",
  "member-log-config.clear-join-message.description":
    "カスタム参加メッセージを削除",
  "member-log-config.clear-leave-message.description":
    "カスタム退出メッセージを削除",
  "member-log-config.reset.description": "メンバーログ設定をリセット",
  "member-log-config.view.description": "現在の設定を表示",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_channel_success":
    "通知チャンネルを {{channel}} に設定しました。",
  "user-response.enable_success": "メンバーログ機能を有効化しました。",
  "user-response.enable_error_no_channel":
    "通知チャンネルが設定されていません。先に /member-log-config set-channel を実行してください。",
  "user-response.disable_success": "メンバーログ機能を無効化しました。",
  "user-response.set_join_message_success": "参加メッセージを設定しました。",
  "user-response.set_leave_message_success": "退出メッセージを設定しました。",
  "user-response.clear_join_message_success": "参加メッセージを削除しました。",
  "user-response.clear_leave_message_success": "退出メッセージを削除しました。",
  "user-response.text_channel_only": "テキストチャンネルを指定してください。",
  "user-response.reset_success": "メンバーログ設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.channel_deleted_notice":
    "⚠️ メンバーログの通知チャンネルが削除されました。\n設定をリセットしたので、`/member-log-config set-channel` で再設定してください。",

  // ── Embed ─────────────────────────────────────
  "embed.title.config_view": "メンバーログ機能",
  "embed.title.reset_confirm": "メンバーログ設定リセット確認",
  "embed.description.reset_confirm":
    "メンバーログ設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。",
  "embed.field.name.reset_target": "削除対象",
  "embed.field.value.reset_target":
    "有効/無効設定 / 通知チャンネル / カスタム参加メッセージ / カスタム退出メッセージ",
  "embed.description.not_configured": "メンバーログが設定されていません。",
  "embed.field.name.channel": "通知チャンネル",
  "embed.field.name.join_message": "参加メッセージ",
  "embed.field.name.leave_message": "退出メッセージ",

  // Join notification embed
  "embed.title.join": "👋 新しいメンバーが参加しました！",
  "embed.field.name.join_username": "ユーザー",
  "embed.field.name.join_account_created": "アカウント作成日時",
  "embed.field.name.join_server_joined": "サーバー参加日時",
  "embed.field.name.join_member_count": "メンバー数",
  "embed.field.name.join_invited_by": "招待元",

  // Leave notification embed
  "embed.title.leave": "👋 メンバーが退出しました。",
  "embed.field.name.leave_username": "ユーザー",
  "embed.field.name.leave_account_created": "アカウント作成日時",
  "embed.field.name.leave_server_joined": "サーバー参加日時",
  "embed.field.name.leave_server_left": "サーバー退出日時",
  "embed.field.name.leave_stay_duration": "滞在期間",
  "embed.field.name.leave_member_count": "メンバー数",

  // Embed field values (shared formatting)
  "embed.field.value.days": "{{count}}日",
  "embed.field.value.member_count": "{{count}}名",
  "embed.field.value.unknown": "不明",
  "embed.field.value.age_years": "{{count}}年",
  "embed.field.value.age_months": "{{count}}ヶ月",
  "embed.field.value.age_days": "{{count}}日",
  "embed.field.value.age_separator": "",

  // ── UIラベル ──────────────────────────────────
  "ui.modal.set_join_message_title": "参加メッセージを設定",
  "ui.modal.set_join_message_label": "参加メッセージ",
  "ui.modal.set_join_message_placeholder":
    "{userMention}, {userName}, {memberCount}, {serverName} を使用可（最大500文字）",
  "ui.modal.set_leave_message_title": "退出メッセージを設定",
  "ui.modal.set_leave_message_label": "退出メッセージ",
  "ui.modal.set_leave_message_placeholder":
    "{userMention}, {userName}, {memberCount}, {serverName} を使用可（最大500文字）",

  // ── ログ ─────────────────────────────────────
  "log.join_notification_sent":
    "参加通知を送信 GuildId: {{guildId}} UserId: {{userId}}",
  "log.leave_notification_sent":
    "退出通知を送信 GuildId: {{guildId}} UserId: {{userId}}",
  "log.notification_failed": "通知送信失敗 GuildId: {{guildId}}",
  "log.channel_not_found":
    "チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted_config_cleared":
    "チャンネルが削除されたため設定をリセットしました。 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_set_channel":
    "チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_enabled": "有効化 GuildId: {{guildId}}",
  "log.config_disabled": "無効化 GuildId: {{guildId}}",
  "log.config_join_message_set": "参加メッセージ設定 GuildId: {{guildId}}",
  "log.config_leave_message_set": "退出メッセージ設定 GuildId: {{guildId}}",
  "log.config_join_message_cleared": "参加メッセージ削除 GuildId: {{guildId}}",
  "log.config_reset": "設定リセット GuildId: {{guildId}}",
  "log.config_leave_message_cleared": "退出メッセージ削除 GuildId: {{guildId}}",
  "log.database_user_setting_find_failed":
    "ユーザー設定取得に失敗 UserId: {{userId}} GuildId: {{guildId}}",
  "log.database_user_setting_upsert_failed":
    "ユーザー設定保存に失敗 UserId: {{userId}} GuildId: {{guildId}}",
} as const;

export type MemberLogTranslations = typeof memberLog;
