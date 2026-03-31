// src/shared/locale/locales/ja/features/afk.ts
// AFK機能の翻訳リソース

export const afk = {
  // ── コマンド定義 ─────────────────────────────
  "afk.description": "AFKチャンネルにユーザーを移動",
  "afk.user.description": "移動するユーザー（省略で自分）",
  "afk-config.description": "AFK機能の設定（サーバー管理権限が必要）",
  "afk-config.set-channel.description": "AFKチャンネルを設定",
  "afk-config.set-channel.channel.description":
    "AFKチャンネル（ボイスチャンネル）",
  "afk-config.view.description": "現在の設定を表示",
  "afk-config.clear-channel.description": "AFKチャンネル設定を解除",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.moved": "{{user}} を {{channel}} に移動しました。",
  "user-response.set_channel_success":
    "AFKチャンネルを {{channel}} に設定しました。",
  "user-response.not_configured":
    "AFKチャンネルが設定されていません。\n`/afk-config set-channel` でチャンネルを設定してください。（サーバー管理権限が必要）",
  "user-response.member_not_found": "ユーザーが見つかりませんでした。",
  "user-response.user_not_in_voice":
    "指定されたユーザーはボイスチャンネルにいません。",
  "user-response.channel_not_found":
    "AFKチャンネルが見つかりませんでした。\nチャンネルが削除されている可能性があります。",
  "user-response.invalid_channel_type": "ボイスチャンネルを指定してください。",
  "user-response.clear_channel_success": "AFKチャンネル設定を解除しました。",

  // ── embed: config_view ──────────────────────
  "embed.title.config_view": "AFK機能",
  "embed.field.name.channel": "AFKチャンネル",

  // ── ログ ─────────────────────────────────────
  "log.moved":
    "ユーザーをAFKチャンネルに移動 GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}}",
  "log.configured":
    "AFKチャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_cleared": "AFKチャンネル設定を解除 GuildId: {{guildId}}",
  "log.database_channel_set":
    "AFKチャンネルを設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_channel_set_failed":
    "AFKチャンネル設定に失敗 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_config_saved": "AFK設定を保存 GuildId: {{guildId}}",
  "log.database_config_save_failed": "AFK設定保存に失敗 GuildId: {{guildId}}",
} as const;

export type AfkTranslations = typeof afk;
