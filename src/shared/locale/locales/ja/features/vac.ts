// src/shared/locale/locales/ja/features/vac.ts
// VAC（VC自動作成）機能の翻訳リソース

export const vac = {
  // ── コマンド定義 ─────────────────────────────
  "vac-settings.description": "VC自動作成機能の設定（サーバー管理権限が必要）",
  "vac-settings.create-trigger-vc.description": "トリガーチャンネルを作成",
  "vac-settings.create-trigger-vc.category.description":
    "作成先カテゴリ（TOP またはカテゴリ。未指定時は実行カテゴリ）",
  "vac-settings.remove-trigger-vc.description": "トリガーチャンネルを削除",
  "vac-settings.remove-trigger-vc.category.description":
    "削除対象（TOP またはカテゴリ。未指定時は実行カテゴリ）",
  "vac-settings.remove-trigger-vc.category.top": "TOP（カテゴリなし）",
  "vac-settings.view.description": "現在の設定を表示",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.trigger_created":
    "トリガーチャンネル {{channel}} を作成しました。",
  "user-response.trigger_removed":
    "トリガーチャンネル {{channel}} を削除しました。",
  "user-response.triggers_removed":
    "{{count}}件のトリガーチャンネルを削除しました。",
  "user-response.not_configured": "VC自動作成機能が設定されていません。",
  "user-response.trigger_not_found":
    "指定されたカテゴリーにはトリガーチャンネルはありません。",
  "user-response.already_exists": "トリガーチャンネルが既に存在します。",
  "user-response.category_full":
    "カテゴリ内のチャンネル数が上限に達しています。",
  "user-response.no_permission":
    "チャンネルを作成または編集する権限がありません。",
  "user-response.not_in_any_vc": "このコマンドはVC参加中にのみ使用できます。",

  // ── embed: remove_error ────────────────────────
  "embed.title.remove_error": "削除エラー",

  // ── embed: config_view ─────────────────────────
  "embed.title.config_view": "VC自動作成機能",
  "embed.field.name.trigger_channels": "トリガーチャンネル",
  "embed.field.name.created_vcs": "作成されたVC数",
  "embed.field.name.created_vc_details": "作成されたVC",
  "embed.field.value.no_created_vcs": "なし",
  "embed.field.value.top": "TOP",

  // ── UIラベル ──────────────────────────────────
  "ui.select.trigger_remove_placeholder":
    "削除するトリガーチャンネルを選択（複数選択可）",
  "ui.button.trigger_remove_confirm": "削除する",

  // ── ログ ─────────────────────────────────────
  "log.startup_cleanup_stale_trigger_removed":
    "起動クリーンアップ: 不正トリガーチャンネルを除去 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_orphaned_channel_removed":
    "起動クリーンアップ: 存在しないVACチャンネルをDB削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_empty_channel_deleted":
    "起動クリーンアップ: 空VACチャンネルを削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.startup_cleanup_done":
    "起動クリーンアップ完了 トリガー {{removedTriggers}} 件・チャンネル {{removedChannels}} 件を削除",
  "log.startup_cleanup_done_none": "起動クリーンアップ完了 不整合なし",
  "log.voice_state_update_failed": "voiceStateUpdate処理失敗",
  "log.channel_created":
    "VCチャンネル作成 GuildId: {{guildId}} ChannelId: {{channelId}} OwnerId: {{ownerId}}",
  "log.channel_deleted":
    "VCチャンネル削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.category_full":
    "カテゴリがチャンネル上限に達しました。 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.category_full_action": "カテゴリのチャンネル上限到達でVC作成不可",
  "log.trigger_removed_by_delete":
    "削除されたトリガーチャンネルを設定から除外 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_delete_sync_failed": "channelDelete同期処理失敗",
  "log.channel_create_failed":
    "Bot権限不足によるVCチャンネル作成失敗 GuildId: {{guildId}}",
  "log.startup_cleanup_failed": "起動時クリーンアップ失敗",
  "log.database_trigger_added":
    "VACトリガーチャンネルを追加 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_add_failed":
    "VACトリガーチャンネル追加に失敗 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_removed":
    "VACトリガーチャンネルを削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_trigger_remove_failed":
    "VACトリガーチャンネル削除に失敗 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_channel_registered":
    "VAC管理チャンネルを登録 GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_register_failed":
    "VAC管理チャンネル登録に失敗 GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_unregistered":
    "VAC管理チャンネルを削除 GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
  "log.database_channel_unregister_failed":
    "VAC管理チャンネル削除に失敗 GuildId: {{guildId}} ChannelId: {{voiceChannelId}}",
} as const;

export type VacTranslations = typeof vac;
