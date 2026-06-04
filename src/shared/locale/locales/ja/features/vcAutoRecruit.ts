// src/shared/locale/locales/ja/features/vcAutoRecruit.ts
// VC自動募集機能の翻訳リソース

export const vcAutoRecruit = {
  // ── コマンド定義 ─────────────────────────────
  "vc-auto-recruit-settings.description":
    "VC自動募集機能の設定（サーバー管理権限が必要）",
  "vc-auto-recruit-settings.set-channel.description": "投稿先チャンネルを設定",
  "vc-auto-recruit-settings.set-channel.channel.description":
    "募集メッセージを投稿するテキストチャンネル",
  "vc-auto-recruit-settings.enable.description": "VC自動募集機能を有効化",
  "vc-auto-recruit-settings.disable.description": "VC自動募集機能を無効化",
  "vc-auto-recruit-settings.set-message.description":
    "カスタム募集メッセージを設定",
  "vc-auto-recruit-settings.clear-message.description":
    "カスタム募集メッセージを削除",
  "vc-auto-recruit-settings.set-embed.description":
    "Embed の有効/無効を切り替え",
  "vc-auto-recruit-settings.set-embed.enabled.description":
    "Embed を投稿に含めるか",
  "vc-auto-recruit-settings.view.description": "現在の設定を表示",
  "vc-auto-recruit-settings.reset.description": "VC自動募集設定をリセット",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_channel_success":
    "投稿先チャンネルを {{channel}} に設定しました。",
  "user-response.enable_success": "VC自動募集機能を有効化しました。",
  "user-response.enable_error_no_channel":
    "投稿先チャンネルが設定されていません。先に /vc-auto-recruit-settings set-channel を実行してください。",
  "user-response.disable_success": "VC自動募集機能を無効化しました。",
  "user-response.set_message_success": "募集メッセージを設定しました。",
  "user-response.clear_message_success": "募集メッセージを削除しました。",
  "user-response.set_embed_enabled": "Embed を有効にしました。",
  "user-response.set_embed_disabled": "Embed を無効にしました。",
  "user-response.text_channel_only": "テキストチャンネルを指定してください。",
  "user-response.channel_deleted_notice":
    "⚠️ VC自動募集の投稿先チャンネルが削除されました。\n設定をリセットしたので、`/vc-auto-recruit-settings set-channel` で再設定してください。",
  "user-response.reset_success": "VC自動募集設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",

  // ── 投稿本文（content） ───────────────────────
  "content.invite_default":
    "{{channel}} で通話が始まりました。参加しませんか？",

  // ── Embed: config_view ───────────────────────
  "embed.title.config_view": "VC自動募集機能",
  "embed.description.not_configured": "VC自動募集が設定されていません。",
  "embed.field.name.channel": "投稿先チャンネル",
  "embed.field.name.embed": "Embed",
  "embed.field.name.message": "カスタムメッセージ",

  // ── Embed: 募集通知 ──────────────────────────
  "embed.title.invite": "🔊 通話がはじまりました",
  "embed.field.name.invite_channel": "VC",
  "embed.field.name.invite_starter": "開始した人",

  // ── Embed: reset_confirm ─────────────────────
  "embed.title.reset_confirm": "VC自動募集設定リセット確認",
  "embed.description.reset_confirm":
    "VC自動募集設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。",
  "embed.field.name.reset_target": "削除対象",
  "embed.field.value.reset_target":
    "有効/無効設定 / 投稿先チャンネル / Embed 設定 / カスタムメッセージ / 追跡中の募集",

  // ── UIラベル ──────────────────────────────────
  "ui.modal.set_message_title": "募集メッセージを設定",
  "ui.modal.set_message_label": "募集メッセージ",
  "ui.modal.set_message_placeholder":
    "{userMention}, {userName}, {channelMention}, {channelName}, {serverName} を使用可（最大500文字）",
  "ui.button.join": "VCに参加",
  "ui.button.ended": "募集終了",

  // ── ログ ─────────────────────────────────────
  "log.invite_sent":
    "募集メッセージを送信 GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}}",
  "log.invite_skipped_cooldown":
    "連投抑制により募集投稿をスキップ GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}}",
  "log.invite_closed":
    "VCが空になり募集終了に変更 GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}} MessageId: {{messageId}}",
  "log.invite_close_failed":
    "募集終了への編集に失敗 GuildId: {{guildId}} MessageId: {{messageId}}",
  "log.startup_cleanup_done":
    "起動クリーンアップ完了 募集終了 {{closed}} 件・除去 {{removed}} 件",
  "log.post_failed": "募集メッセージ送信失敗 GuildId: {{guildId}}",
  "log.channel_not_found":
    "投稿先チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted_config_cleared":
    "チャンネルが削除されたため設定をリセットしました。 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_set_channel":
    "投稿先チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.config_enabled": "有効化 GuildId: {{guildId}}",
  "log.config_disabled": "無効化 GuildId: {{guildId}}",
  "log.config_message_set": "募集メッセージ設定 GuildId: {{guildId}}",
  "log.config_message_cleared": "募集メッセージ削除 GuildId: {{guildId}}",
  "log.config_embed_set":
    "Embed 設定変更 GuildId: {{guildId}} Enabled: {{enabled}}",
  "log.config_reset": "設定リセット GuildId: {{guildId}}",
  "log.voice_state_update_failed": "voiceStateUpdate処理失敗（VC自動募集）",
  "log.channel_delete_failed": "channelDelete同期処理失敗（VC自動募集）",
  "log.startup_cleanup_failed": "起動クリーンアップ失敗（VC自動募集）",
} as const;

export type VcAutoRecruitTranslations = typeof vcAutoRecruit;
