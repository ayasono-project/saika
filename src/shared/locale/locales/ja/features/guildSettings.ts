// src/shared/locale/locales/ja/features/guildSettings.ts
// ギルド設定機能の翻訳リソース

export const guildSettings = {
  // ── コマンド定義 ─────────────────────────────
  "guild-settings.description": "ギルド設定を管理（サーバー管理権限が必要）",
  "guild-settings.set-locale.description": "Botの応答言語を設定",
  "guild-settings.set-locale.locale.description": "設定する言語を選択",
  "guild-settings.set-error-channel.description": "エラー通知チャンネルを設定",
  "guild-settings.set-error-channel.channel.description":
    "エラー通知先テキストチャンネル",
  "guild-settings.view.description": "現在のギルド設定を表示",
  "guild-settings.reset.description": "ギルド設定をリセット",
  "guild-settings.reset-all.description": "全機能の設定を一括リセット",
  "guild-settings.export.description": "ギルド設定をエクスポート",
  "guild-settings.import.description": "JSONファイルからギルド設定をインポート",
  "guild-settings.import.file.description": "エクスポートしたJSONファイル",

  // ── チョイス名 ──────────────────────────────
  "choice.locale.ja": "日本語",
  "choice.locale.en": "English",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_locale_success":
    "サーバーの言語を「{{locale}}」に設定しました。",
  "user-response.set_error_channel_success":
    "エラー通知チャンネルを {{channel}} に設定しました。",
  "user-response.invalid_channel_type":
    "テキストチャンネルを指定してください。",
  "user-response.reset_success": "ギルド設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.reset_all_success": "全機能の設定をリセットしました。",
  "user-response.reset_all_cancelled": "リセットをキャンセルしました。",
  "user-response.export_success": "ギルド設定をエクスポートしました。",
  "user-response.export_empty": "エクスポートする設定がありません。",
  "user-response.import_success": "ギルド設定をインポートしました。",
  "user-response.import_cancelled": "インポートをキャンセルしました。",
  "user-response.import_invalid_json":
    "ファイルの形式が正しくありません。エクスポートしたJSONファイルを添付してください。",
  "user-response.import_unsupported_version":
    "このファイルのバージョンには対応していません。",
  "user-response.import_guild_mismatch":
    "このファイルは別のサーバーの設定です。同じサーバーでエクスポートしたファイルを使用してください。",
  "user-response.import_missing_channels":
    "一部のチャンネルまたはロールが見つかりません。設定を確認してください。",

  // ── embed: view ───────────────────────────────
  "embed.title.view": "ギルド設定",
  "embed.field.name.locale": "言語",
  "embed.field.name.error_channel": "エラー通知チャンネル",

  // ── embed: reset_confirm ──────────────────────
  "embed.title.reset_confirm": "ギルド設定リセット確認",
  "embed.description.reset_confirm":
    "ギルド設定（言語・エラー通知チャンネル）をリセットしますか？\nこの操作は元に戻せません。",

  // ── embed: reset_all_confirm ──────────────────
  "embed.title.reset_all_confirm": "全設定リセット確認",
  "embed.description.reset_all_confirm":
    "全機能の設定をリセットしますか？\n以下の設定がすべて削除されます。この操作は元に戻せません。",
  "embed.field.name.reset_all_target": "削除対象",
  "embed.field.value.reset_all_target":
    "言語設定 / エラー通知チャンネル / AFK / VAC / VC募集 / メッセージ固定 / メンバーログ / Bumpリマインダー",

  // ── embed: import_confirm ─────────────────────
  "embed.title.import_confirm": "ギルド設定インポート確認",
  "embed.description.import_confirm":
    "設定系は上書き、stateful データはマージ（既存優先）で取り込みます。この操作は元に戻せません。",
  "embed.field.name.import_config": "設定系",
  "embed.field.name.import_state": "stateful（新規追加予定）",
  "embed.field.value.import_state_summary":
    "チケット設定: {{ticketSettings}} 件 / open チケット: {{openTickets}} 件 / スティッキー: {{stickyMessages}} 件 / リアクションロール: {{reactionRolePanels}} 件 / VAC 作成 VC: {{vacCreatedChannels}} 件",

  // ── UIラベル ──────────────────────────────────
  "ui.button.reset_all_confirm": "リセットする",
  "ui.button.reset_all_cancel": "キャンセル",
  "ui.button.import_confirm": "インポートする",
  "ui.button.import_cancel": "キャンセル",

  // ── エラーチャンネル通知 ─────────────────────────
  "error-notification.title": "エラー通知",
  "error-notification.warn_title": "警告通知",
  "error-notification.feature": "機能",
  "error-notification.action": "処理",
  "error-notification.message": "詳細",

  // ── ログ ──────────────────────────────────────
  "log.locale_set": "言語設定 GuildId: {{guildId}} Locale: {{locale}}",
  "log.error_channel_set":
    "エラー通知チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.reset": "ギルド設定リセット GuildId: {{guildId}}",
  "log.reset_all": "全設定リセット GuildId: {{guildId}}",
  "log.exported": "ギルド設定エクスポート GuildId: {{guildId}}",
  "log.imported": "ギルド設定インポート GuildId: {{guildId}}",
} as const;

export type GuildSettingsTranslations = typeof guildSettings;
