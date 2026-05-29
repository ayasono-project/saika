// src/shared/locale/locales/ja/system.ts
// 機能横断のシステムメッセージ翻訳リソース

export const system = {
  // ログプレフィックス
  // logPrefixed() ヘルパーで自動付与される機能名・イベント名
  "log_prefix.bot": "Bot",
  "log_prefix.bump_reminder": "Bumpリマインダー",
  "log_prefix.sticky_message": "スティッキーメッセージ",
  "log_prefix.member_log": "メンバーログ",
  "log_prefix.vac": "VAC",
  "log_prefix.vc_recruit": "VC募集",
  "log_prefix.msg_del": "メッセージ削除",
  "log_prefix.afk": "AFK",
  "log_prefix.database": "データベース",
  "log_prefix.cooldown": "クールダウン",
  "log_prefix.scheduler": "スケジューラー",
  "log_prefix.web": "Webサーバー",
  "log_prefix.json": "JSON",
  "log_prefix.interaction_create": "interactionCreate",
  "log_prefix.guild_member_add": "guildMemberAdd",
  "log_prefix.guild_member_remove": "guildMemberRemove",
  "log_prefix.message_create": "messageCreate",
  "log_prefix.message_delete": "messageDelete",
  "log_prefix.voice_state_update": "voiceStateUpdate",
  "log_prefix.channel_delete": "channelDelete",
  "log_prefix.guild_delete": "guildDelete",
  "log_prefix.ready": "ready",
  "log_prefix.ticket": "チケット",
  "log_prefix.reaction_role": "リアクションロール",
  "log_prefix.guild_config": "ギルド設定",
  "log_prefix.error_channel": "エラーチャンネル通知",

  // エラーチャンネル通知の内部ログ
  "error_channel.send_error_failed":
    "エラー通知の送信に失敗しました GuildId: {{guildId}}",
  "error_channel.send_warn_failed":
    "警告通知の送信に失敗しました GuildId: {{guildId}}",

  // guildDelete（Bot退出時クリーンアップ）
  "guild_delete.start":
    "ギルド退出を検知 設定データを削除します GuildId: {{guildId}} GuildName: {{guildName}}",
  "guild_delete.complete":
    "ギルド設定データの削除が完了しました GuildId: {{guildId}}",
  "guild_delete.failed":
    "ギルド設定データの削除に失敗しました GuildId: {{guildId}}",

  // Bot起動・シャットダウン
  "bot.starting": "Discord Botを起動しています...",
  "bot.commands.registering": "{{count}}個のコマンドを登録しています...",
  "bot.commands.registered": "コマンド登録完了",
  "bot.commands.command_registered": "  ✓ /{{name}}",
  "bot.events.registering": "{{count}}個のイベントを登録しています...",
  "bot.events.registered": "イベント登録完了",
  "bot.startup.error": "起動中にエラーが発生しました:",
  "bot.startup.failed": "起動失敗:",
  "bot.client.initialized": "Discord Botクライアントを初期化しました。",
  "bot.client.shutting_down": "Botクライアントをシャットダウンしています...",
  "bot.client.shutdown_complete":
    "Botクライアントのシャットダウンが完了しました。",
  "bot.presence_activity": "せいちょーちう。 | {{count}} servers",

  // エラーハンドリング
  "error.reply_failed": "エラーメッセージの送信に失敗しました。",
  "error.missing_permissions": "Bot権限不足 URL: {{url}} Method: {{method}}",
  "error.unhandled_rejection": "未処理のPromise拒否:",
  "error.uncaught_exception": "未処理の例外:",
  "error.unhandled_rejection_log": "未処理のPromise拒否:",
  "error.uncaught_exception_log": "未捕捉の例外:",
  "error.node_warning": "Node警告:",
  "error.global_handlers_already_registered":
    "グローバルエラーハンドラーは既に登録済みです。スキップします。",
  "error.shutdown_handlers_already_registered":
    "グレースフルシャットダウンハンドラーは既に登録済みです。スキップします。",

  // ロケール
  "locale.manager_initialized": "LocaleManagerをi18nextで初期化しました。",
  "locale.translation_failed": "翻訳に失敗しました Key: {{key}}",

  // クールダウンマネージャー
  "cooldown.cleared_all": "すべてのクールダウンをクリアしました。",
  "cooldown.destroyed": "CooldownManager を破棄しました。",
  "cooldown.reset": "リセット CommandName: {{commandName}} UserId: {{userId}}",
  "cooldown.cleared_for_command":
    "コマンドの全クールダウンをクリア CommandName: {{commandName}}",
  "cooldown.cleanup": "{{count}}個の期限切れクールダウンを削除しました。",

  // スケジューラー（汎用ジョブ）
  "scheduler.stopping": "すべてのスケジュール済みジョブを停止中...",
  "scheduler.job_exists": "Job既存のため古いJobを削除 JobId: {{jobId}}",
  "scheduler.executing_job": "Job実行中 JobId: {{jobId}}",
  "scheduler.job_completed": "Job完了 JobId: {{jobId}}",
  "scheduler.job_error": "Jobエラー JobId: {{jobId}}",
  "scheduler.schedule_failed": "Jobスケジュール失敗 JobId: {{jobId}}",
  "scheduler.job_removed": "Job削除 JobId: {{jobId}}",
  "scheduler.job_stopped": "Job停止 JobId: {{jobId}}",
  "scheduler.job_scheduled": "Jobスケジュール完了 JobId: {{jobId}}",

  // シャットダウン
  "shutdown.signal_received":
    "{{signal}} を受信、適切にシャットダウンしています...",
  "shutdown.already_in_progress":
    "{{signal}} を受信しましたが、シャットダウンは既に進行中です。",
  "shutdown.cleanup_complete": "クリーンアップ完了",
  "shutdown.cleanup_failed": "クリーンアップ中のエラー:",
  "shutdown.gracefully": "適切にシャットダウンしています...",
  "shutdown.sigterm": "SIGTERMを受信、シャットダウンしています...",

  // データベース操作ログ（GuildSettings 汎用のみ）
  "database.prisma_not_available": "Prismaクライアントが利用できません。",
  "database.get_config_log": "設定取得に失敗 GuildId: {{guildId}}",
  "database.save_config_log": "設定保存に失敗 GuildId: {{guildId}}",
  "database.saved_config": "設定を保存 GuildId: {{guildId}}",
  "database.update_config_log": "設定更新に失敗 GuildId: {{guildId}}",
  "database.updated_config": "設定を更新 GuildId: {{guildId}}",
  "database.delete_config_log": "設定削除に失敗 GuildId: {{guildId}}",
  "database.deleted_config": "設定を削除 GuildId: {{guildId}}",
  "database.check_existence_log": "存在確認に失敗 GuildId: {{guildId}}",

  // Bot起動イベントログ
  "ready.bot_ready": "✅ Botの準備が完了しました！ {{tag}} としてログイン",
  "ready.servers": "📊 サーバー数: {{count}}",
  "ready.users": "👥 ユーザー数: {{count}}",
  "ready.commands": "💬 コマンド数: {{count}}",
  "ready.event_registered": "  ✓ {{name}}",
  "ready.startup_init_failed": "起動時の初期化処理でエラーが発生しました",

  // インタラクションイベントログ
  "interaction.unknown_command": "不明なコマンド CommandName: {{commandName}}",
  "interaction.command_executed":
    "コマンド実行 CommandName: {{commandName}} UserId: {{userId}}",
  "interaction.command_error":
    "コマンド実行エラー CommandName: {{commandName}}",
  "interaction.autocomplete_error":
    "自動補完エラー CommandName: {{commandName}}",
  "interaction.unknown_modal": "不明なモーダル CustomId: {{customId}}",
  "interaction.modal_submitted":
    "モーダル送信 CustomId: {{customId}} UserId: {{userId}}",
  "interaction.modal_error": "モーダル実行エラー CustomId: {{customId}}",
  "interaction.button_error": "ボタン実行エラー CustomId: {{customId}}",
  "interaction.select_menu_error":
    "セレクトメニュー実行エラー CustomId: {{customId}}",

  // Webサーバー
  "web.server_started": "起動 URL: {{url}}",
  "web.startup_error": "起動エラー:",
  "web.unhandled_rejection": "未処理のPromise拒否:",
  "web.uncaught_exception": "未処理の例外:",
  "web.startup_failed": "起動失敗:",
  "web.api_error": "APIエラー:",
  "web.internal_server_error": "内部サーバーエラー",
  "web.auth_unauthorized":
    "[Auth] 未認証リクエスト Method: {{method}} URL: {{url}}",
  "web.auth_invalid_token":
    "[Auth] 無効なトークン Method: {{method}} URL: {{url}}",
  "web.auth_unauthorized_error": "Unauthorized",
  "web.auth_forbidden_error": "Forbidden",
  "web.auth_header_required":
    "Authorization: Bearer <api-key> ヘッダーが必要です。",
  "web.auth_invalid_token_message": "無効なトークンです。",
  "web.auth_session_required": "ログインが必要です。",
  "web.auth_session_expired":
    "セッションが切れました。再ログインしてください。",
  "web.auth_no_session_cookie":
    "[Auth] セッション Cookie なし Method: {{method}} URL: {{url}}",
  "web.oauth_denied": "[OAuth] 認可が拒否されました Error: {{error}}",
  "web.oauth_state_mismatch": "[OAuth] state パラメータが一致しません",
  "web.oauth_login_success":
    "[OAuth] ログイン成功 UserId: {{userId}} Username: {{username}}",
  "web.oauth_callback_error": "[OAuth] コールバック処理エラー:",
  "web.discord_user_fetch_error": "[OAuth] Discord ユーザー情報取得エラー:",
  "web.discord_api_error": "Discord との通信に失敗しました。",
  "web.session_refresh_failed":
    "[Session] トークンリフレッシュ失敗 SessionId: {{sessionId}} UserId: {{userId}}",
  "web.session_cleanup":
    "[Session] 期限切れセッションを削除しました 件数: {{count}}",
  "web.session_cleanup_error": "[Session] クリーンアップエラー:",
  "web.guild_id_required": "ギルド ID が必要です。",
  "web.guild_not_member": "このサーバーのメンバーではありません。",
  "web.guild_permission_denied": "このサーバーの管理権限がありません。",

  // Discord エラー通知
  "discord.error_notification_title": "🚨 {{appName}} エラー通知",

  // エラーユーティリティ
  "error.base_error_log": "[{{errorName}}] {{message}}",
  "error.unhandled_error_log": "[UnhandledError] {{message}}",
} as const;

export type SystemTranslations = typeof system;
