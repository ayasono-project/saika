// src/shared/locale/locales/ja/features/stickyMessage.ts
// スティッキーメッセージ機能の翻訳リソース

export const stickyMessage = {
  // ── コマンド定義 ─────────────────────────────
  "sticky-message.description":
    "スティッキーメッセージ（チャンネル最下部固定）の管理（チャンネル管理権限が必要）",
  "sticky-message.set.description":
    "スティッキーメッセージを設定（モーダル入力）",
  "sticky-message.set.channel.description":
    "設定するテキストチャンネル（省略時はこのチャンネル）",
  "sticky-message.set.style.description":
    "表示スタイル（text: テキスト / embed: Embed、省略時: text）",
  "sticky-message.remove.description": "スティッキーメッセージを削除",
  "sticky-message.view.description":
    "スティッキーメッセージ設定を確認（チャンネル選択UI）",
  "sticky-message.update.description":
    "スティッキーメッセージの内容を更新（モーダル入力）",
  "sticky-message.update.channel.description":
    "更新対象のチャンネル（省略時はこのチャンネル）",
  "sticky-message.update.style.description":
    "表示スタイル（text: テキスト / embed: Embed、省略時: text）",

  // ── チョイス名 ──────────────────────────────
  "choice.style.text": "テキスト",
  "choice.style.embed": "Embed",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_success": "スティッキーメッセージを設定しました。",
  "user-response.already_exists":
    "既にスティッキーメッセージが設定されています。削除してから再度設定してください。",
  "user-response.remove_no_selection": "削除するチャンネルを選択してください。",
  "user-response.remove_success":
    "{{count}}件のスティッキーメッセージを削除しました。",
  "user-response.remove_not_found":
    "スティッキーメッセージは設定されていません。",
  "user-response.view_empty":
    "スティッキーメッセージが設定されているチャンネルがありません。",
  "user-response.update_success": "スティッキーメッセージを更新しました。",
  "user-response.permission_denied":
    "この操作を実行する権限がありません。チャンネル管理権限が必要です。",
  "user-response.empty_message": "メッセージ内容を入力してください。",
  "user-response.text_channel_only": "テキストチャンネルにのみ設定できます。",
  "user-response.operation_failed":
    "スティッキーメッセージの操作中にエラーが発生しました。",

  // ── Embed ─────────────────────────────────────
  "embed.title.set_success": "設定完了",
  "embed.title.already_exists": "警告",
  "embed.title.remove_success": "削除完了",
  "embed.title.remove_not_found": "未設定",
  "embed.title.view": "スティッキーメッセージ設定",
  "embed.title.view_not_found": "未設定",
  "embed.title.update_success": "更新完了",
  "embed.title.update_not_found": "未設定",
  "embed.field.name.removed_channels": "削除したチャンネル",
  "embed.field.name.channel": "チャンネル",
  "embed.field.name.format": "形式",
  "embed.field.value.format_plain": "プレーンテキスト",
  "embed.field.value.format_embed": "Embed",
  "embed.field.name.updated_at": "最終更新",
  "embed.field.name.updated_by": "設定者",
  "embed.field.name.content": "メッセージ内容",
  "embed.field.name.embed_title": "Embedタイトル",
  "embed.field.name.embed_color": "Embedカラー",

  // ── UIラベル ──────────────────────────────────
  "ui.modal.set_title": "スティッキーメッセージの内容を入力",
  "ui.modal.set_message_label": "メッセージ内容",
  "ui.modal.set_message_placeholder":
    "改行して複数行のメッセージを入力できます（最大2000文字）",
  "ui.modal.set_embed_title": "Embed スティッキーメッセージを設定",
  "ui.modal.set_embed_title_label": "タイトル",
  "ui.modal.set_embed_title_placeholder":
    "Embed のタイトルを入力（最大256文字）",
  "ui.modal.set_embed_description_label": "内容",
  "ui.modal.set_embed_description_placeholder":
    "Embed の内容を入力（最大4096文字）",
  "ui.modal.set_embed_color_label": "カラーコード(任意)",
  "ui.modal.set_embed_color_placeholder":
    "#008969 または 0x008969 形式で入力（省略時: #008969）",
  "ui.select.remove_placeholder": "削除するチャンネルを選択（複数選択可）",
  "ui.button.remove": "削除する",
  "ui.select.view_placeholder": "チャンネルを選択してください。",
  "ui.modal.update_title": "スティッキーメッセージを更新",
  "ui.modal.update_message_label": "メッセージ内容",
  "ui.modal.update_message_placeholder":
    "改行して複数行入力できます（最大2000文字）",
  "ui.modal.update_embed_title": "Embed スティッキーメッセージを更新",

  // ── ログ ─────────────────────────────────────
  "log.channel_delete_cleanup":
    "channelDelete時クリーンアップ完了 ChannelId: {{channelId}}",
  "log.channel_delete_cleanup_failed":
    "channelDelete時レコード削除失敗 ChannelId: {{channelId}}",
  "log.create_handler_error":
    "messageCreate処理エラー ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.resend_scheduled_error": "再送スケジュールエラー",
  "log.send_failed":
    "メッセージ送信失敗 ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.previous_deleted_or_not_found":
    "前回メッセージ削除済みまたは未存在 ChannelId: {{channelId}}",
  "log.set_failed":
    "モーダルからの設定失敗 ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.set_embed_failed":
    "Embedモーダルからの設定失敗 ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.update_failed":
    "モーダルからの更新失敗 ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.update_embed_failed":
    "Embedモーダルからの更新失敗 ChannelId: {{channelId}} GuildId: {{guildId}}",
  "log.resend_after_update_failed":
    "更新後の再送信失敗 ChannelId: {{channelId}}",
  "log.resend_after_embed_update_failed":
    "Embed更新後の再送信失敗 ChannelId: {{channelId}}",
  "log.database_find_by_channel_failed":
    "スティッキーメッセージ取得に失敗 ChannelId: {{channelId}}",
  "log.database_find_all_by_guild_failed":
    "スティッキーメッセージ全件取得に失敗 GuildId: {{guildId}}",
  "log.database_create_failed":
    "スティッキーメッセージ作成に失敗 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_update_last_message_id_failed":
    "スティッキーメッセージ lastMessageId 更新に失敗 Id: {{id}}",
  "log.database_update_content_failed":
    "スティッキーメッセージ内容更新に失敗 Id: {{id}}",
  "log.database_delete_failed": "スティッキーメッセージ削除に失敗 Id: {{id}}",
  "log.database_delete_by_channel_failed":
    "スティッキーメッセージ削除に失敗 ChannelId: {{channelId}}",
} as const;

export type StickyMessageTranslations = typeof stickyMessage;
