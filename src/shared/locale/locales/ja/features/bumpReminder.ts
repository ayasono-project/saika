// src/shared/locale/locales/ja/features/bumpReminder.ts
// Bumpリマインダー機能の翻訳リソース

export const bumpReminder = {
  // ── コマンド定義 ─────────────────────────────
  "bump-reminder-config.description":
    "Bumpリマインダーの設定（サーバー管理権限が必要）",
  "bump-reminder-config.enable.description": "Bumpリマインダー機能を有効化",
  "bump-reminder-config.disable.description": "Bumpリマインダー機能を無効化",
  "bump-reminder-config.set-mention.description": "メンションロールを設定",
  "bump-reminder-config.set-mention.role.description":
    "リマインダーでメンションするロール",
  "bump-reminder-config.remove-mention.description":
    "メンションロール設定を削除",
  "bump-reminder-config.remove-mention-users.description": "通知ユーザーを削除",
  "bump-reminder-config.reset.description": "Bumpリマインダー設定をリセット",
  "bump-reminder-config.view.description": "現在の設定を表示",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.enable_success": "Bumpリマインダー機能を有効化しました。",
  "user-response.disable_success": "Bumpリマインダー機能を無効化しました。",
  "user-response.set_mention_role_success":
    "メンションロールを {{role}} に設定しました。",
  "user-response.set_mention_error": "メンションロールの設定に失敗しました。",
  "user-response.remove_mention_role": "メンションロールの登録を削除しました。",
  "user-response.reminder_message_disboard":
    "⏰ `/bump` が出来るようになったよ！",
  "user-response.reminder_message_dissoku": "⏰ `/up` が出来るようになったよ！",
  "user-response.reminder_message": "⏰ **Bump出来るようになったよ！**",
  "user-response.panel_scheduled_at":
    "<t:{{timestamp}}:R>にリマインドが通知されます。",
  "user-response.panel_mention_toggled_on": "通知をONにしました。",
  "user-response.panel_mention_toggled_off": "通知をOFFにしました。",
  "user-response.reset_success": "Bumpリマインダー設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.remove_users_success":
    "選択したユーザーを通知リストから削除しました。",
  "user-response.remove_users_empty": "通知登録されているユーザーがいません。",
  "user-response.panel_update_failed": "Bump通知リストの更新に失敗しました。",

  // ── embed: not_configured ──────────────────────
  "embed.description.not_configured": "Bumpリマインダーが設定されていません。",

  // ── embed: reset ─────────────────────────────
  "embed.title.reset_confirm": "Bumpリマインダー設定リセット確認",
  "embed.description.reset_confirm":
    "Bumpリマインダー設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。",
  "embed.field.name.reset_target": "削除対象",
  "embed.field.value.reset_target":
    "有効/無効設定 / メンションロール / メンションユーザー / 進行中のリマインダー",

  // ── embed: remove_users ──────────────────────
  "embed.title.remove_users": "通知ユーザー削除",
  "embed.description.remove_users": "削除するユーザーを選択してください。",

  // ── embed: config_view ─────────────────────────
  "embed.title.config_view": "Bumpリマインダー機能",
  "embed.description.config_view": "現在の設定状態",

  // ── embed: panel ───────────────────────────────
  "embed.title.panel": "Bumpリマインダー機能",

  // ── embed fields ───────────────────────────────
  "embed.field.name.mention_role": "メンションロール",
  "embed.field.name.mention_users": "メンションユーザー",

  // ── UIラベル ──────────────────────────────────
  "ui.button.mention_on": "ユーザー通知をONにする",
  "ui.button.mention_off": "ユーザー通知をOFFにする",
  "ui.button.select_all": "全員を選択",
  "ui.button.submit_delete": "削除する",

  // ── ログ ─────────────────────────────────────
  "log.detected": "Bumpを検知 GuildId: {{guildId}} Service: {{service}}",
  "log.detection_failed": "Bump検知処理に失敗 GuildId: {{guildId}}",
  "log.panel_mention_updated":
    "メンション {{action}} UserId: {{userId}} GuildId: {{guildId}}",
  "log.panel_handle_failed": "パネルボタン処理失敗",
  "log.panel_reply_failed": "パネルボタン エラー返信失敗",
  "log.config_enabled": "有効化 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_disabled": "無効化 GuildId: {{guildId}}",
  "log.config_mention_set":
    "メンションロール設定 GuildId: {{guildId}} RoleId: {{roleId}}",
  "log.config_reset": "設定リセット GuildId: {{guildId}}",
  "log.config_mention_removed":
    "メンション設定削除 GuildId: {{guildId}} Target: {{target}}",
  "log.config_users_removed":
    "メンションユーザー削除 GuildId: {{guildId}} UserIds: {{userIds}}",
  "log.scheduler_task_failed": "タスク失敗 GuildId: {{guildId}}",
  "log.scheduler_description": "GuildId: {{guildId}} ExecuteAt: {{executeAt}}",
  "log.scheduler_scheduled":
    "{{minutes}} 分後にリマインダーをスケジュール GuildId: {{guildId}}",
  "log.scheduler_cancelling":
    "既存リマインダーをキャンセル中 GuildId: {{guildId}}",
  "log.scheduler_cancelled":
    "リマインダーをキャンセルしました。 GuildId: {{guildId}}",
  "log.scheduler_executing_immediately":
    "期限切れリマインダーを即座に実行 GuildId: {{guildId}}",
  "log.scheduler_restored": "保留中リマインダー {{count}} 件を復元",
  "log.scheduler_restored_none": "復元対象のリマインダーなし",
  "log.scheduler_sent":
    "リマインダーを送信 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_send_failed":
    "リマインダー送信に失敗 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_channel_not_found":
    "チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.scheduler_disabled": "無効化されています。 GuildId: {{guildId}}",
  "log.scheduler_restore_failed": "復元に失敗:",
  "log.scheduler_duplicates_cancelled":
    "重複リマインダー {{count}} 件をキャンセル",
  "log.scheduler_duplicates_none": "重複リマインダーなし",
  "log.scheduler_unregistered_channel":
    "未登録チャンネルのためスキップ GuildId: {{guildId}} ChannelId: {{channelId}} ExpectedChannelId: {{expectedChannelId}}",
  "log.scheduler_orphaned_panel_delete_failed":
    "孤立パネルメッセージ削除失敗 PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_deleted":
    "パネルメッセージを削除 GuildId: {{guildId}} PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_delete_failed":
    "パネルメッセージ削除失敗 PanelMessageId: {{panelMessageId}}",
  "log.scheduler_panel_send_failed": "パネルの送信に失敗",
  "log.database_created":
    "Bumpリマインダーを作成 Id: {{id}} GuildId: {{guildId}}",
  "log.database_create_failed":
    "Bumpリマインダー作成に失敗 GuildId: {{guildId}}",
  "log.database_find_failed": "Bumpリマインダー取得に失敗 Id: {{id}}",
  "log.database_find_all_failed": "保留中Bumpリマインダーの取得に失敗",
  "log.database_status_updated":
    "Bumpリマインダーのステータスを更新 Id: {{id}} Status: {{status}}",
  "log.database_update_failed": "Bumpリマインダー更新に失敗 Id: {{id}}",
  "log.database_deleted": "Bumpリマインダーを削除 Id: {{id}}",
  "log.database_delete_failed": "Bumpリマインダー削除に失敗 Id: {{id}}",
  "log.database_cancelled_by_guild":
    "保留中Bumpリマインダーをキャンセル GuildId: {{guildId}}",
  "log.database_cancelled_by_channel":
    "保留中Bumpリマインダーをキャンセル GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_cancel_failed":
    "Bumpリマインダーキャンセルに失敗 GuildId: {{guildId}}",
  "log.database_cleanup_completed":
    "古いBumpリマインダー {{count}} 件をクリーンアップ ({{days}} 日以前)",
  "log.database_cleanup_failed": "古いBumpリマインダーのクリーンアップに失敗",
} as const;

export type BumpReminderTranslations = typeof bumpReminder;
