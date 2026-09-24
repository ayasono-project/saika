// 機能横断のシステムメッセージ翻訳リソース

export const system = {
  // ログプレフィックス
  // logPrefixed() ヘルパーで自動付与される機能名・イベント名
  "log_prefix.bot": "Bot",
  "log_prefix.bump_reminder": "Bumpリマインダー",
  "log_prefix.sticky_message": "スティッキーメッセージ",
  "log_prefix.member_log": "メンバーログ",
  "log_prefix.unverified_kick": "未承認キック",
  "log_prefix.vac": "VAC",
  "log_prefix.vc_auto_recruit": "VC自動募集",
  "log_prefix.msg_del": "メッセージ削除",
  "log_prefix.afk": "AFK",
  "log_prefix.database": "データベース",
  "log_prefix.cooldown": "クールダウン",
  "log_prefix.scheduler": "スケジューラー",
  "log_prefix.web": "Webサーバー",
  "log_prefix.interaction_create": "interactionCreate",
  "log_prefix.guild_create": "guildCreate",
  "log_prefix.guild_delete": "guildDelete",
  "log_prefix.guild_deletion": "データ削除",
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

  // guildCreate（Bot参加時）
  "guild_create.joined":
    "ギルドへの参加を検知しました GuildId: {{guildId}} GuildName: {{guildName}}",
  "guild_create.registry_failed":
    "ギルドの親レコード作成に失敗しました 次回の照合（起動時・毎日4時）で補完します GuildId: {{guildId}}",

  // guildDelete（Bot退出時クリーンアップ）
  "guild_delete.start":
    "ギルド退出を検知 ジョブを停止します（設定データは保持） GuildId: {{guildId}} GuildName: {{guildName}}",
  "guild_delete.complete":
    "ジョブ停止が完了しました データは猶予後に削除予定です GuildId: {{guildId}} DeleteAt: {{deleteAt}}",
  "guild_delete.failed":
    "ジョブ停止またはデータ削除の予約に失敗しました GuildId: {{guildId}}",

  // ギルド登録の照合と猶予切れギルドのデータ削除スイープ
  "guild_deletion.purged":
    "猶予切れギルドのデータを削除しました 件数: {{count}}",
  "guild_deletion.no_target": "照合の結果、変更はありません",
  "guild_deletion.schedule_cancelled":
    "参加中ギルドの削除予約を取り消しました 件数: {{count}}",
  "guild_deletion.schedule_added":
    "参加していないのに削除予約の無いギルドへ予約を入れました 件数: {{count}}",
  "guild_deletion.sweep_failed":
    "ギルド登録の照合または猶予切れギルドの削除に失敗しました",

  // Bot起動・シャットダウン
  "bot.starting": "Discord Botを起動しています...",
  "bot.commands.registering": "{{count}}個のコマンドを登録しています...",
  "bot.commands.registered": "コマンド登録完了",
  "bot.commands.command_registered": "  ✓ /{{name}}",
  "bot.commands.global_cleared":
    "開発環境のためグローバルコマンドを空にしました（残骸の掃除）",
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

  // データベース操作ログ（GuildSettings 汎用のみ）
  "database.prisma_not_available": "Prismaクライアントが利用できません。",

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
  "web.api_error": "APIエラー:",
  "web.internal_server_error": "内部サーバーエラー",
  "web.auth_session_required": "ログインが必要です。",
  "web.guild_id_required": "ギルド ID が必要です。",
  "web.channel_id_required": "チャンネル ID が必要です。",
  "web.category_id_required": "カテゴリ ID が必要です。",
  "web.sticky_not_found": "固定メッセージが見つかりません。",
  "web.reaction_role_not_found": "リアクションロールパネルが見つかりません。",
  "web.ticket_panel_not_found": "チケットパネルが見つかりません。",
  "web.ticket_category_exists":
    "このカテゴリには既にチケットパネルがあります。",
  "web.guild_permission_denied": "このサーバーの管理権限がありません。",
  "web.not_found_route": "エンドポイントが見つかりません。",
  "web.not_ready": "サービスの準備ができていません。",
  "web.bot_not_in_guild": "Bot がこのサーバーに参加していません。",

  // Discord エラー通知
  "discord.error_notification_title": "🚨 {{appName}} エラー通知",

  // エラーユーティリティ
  "error.base_error_log": "[{{errorName}}] {{message}}",
  "error.unhandled_error_log": "[UnhandledError] {{message}}",
} as const;

export type SystemTranslations = typeof system;
