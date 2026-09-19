// src/shared/locale/locales/ja/features/afk.ts
// AFK機能の翻訳リソース
// action-log.* / bulk-confirm.* と target 系の user-response.* は、
// /afk の結果 Embed と一括確認ダイアログ（src/bot/shared/ の共通ヘルパー）が使う。
// 2026-09-20 の /vc 削除で vc 名前空間から移設した（キー名は保持）。

export const afk = {
  // ── コマンド定義 ─────────────────────────────
  "afk.description": "AFKチャンネルにユーザーを移動",
  "afk.target-member.description": "移動するメンバー",
  "afk.target-channel.description": "全員をAFKチャンネルに移動する対象VC",
  "afk-settings.description": "AFK機能の設定（サーバー管理権限が必要）",
  "afk-settings.set-channel.description": "AFKチャンネルを設定",
  "afk-settings.set-channel.channel.description":
    "AFKチャンネル（ボイスチャンネル）",
  "afk-settings.view.description": "現在の設定を表示",
  "afk-settings.clear-channel.description": "AFKチャンネル設定を解除",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_channel_success":
    "AFKチャンネルを {{channel}} に設定しました。",
  "user-response.not_configured":
    "AFKチャンネルが設定されていません。\n`/afk-settings set-channel` でチャンネルを設定してください。（サーバー管理権限が必要）",
  "user-response.channel_not_found":
    "AFKチャンネルが見つかりませんでした。\nチャンネルが削除されている可能性があります。",
  "user-response.invalid_channel_type": "ボイスチャンネルを指定してください。",
  "user-response.clear_channel_success": "AFKチャンネル設定を解除しました。",
  "user-response.target_is_afk": "対象VCがAFKチャンネルと同じです。",
  "user-response.target_required":
    "対象のメンバー、またはVCを指定してください。",
  "user-response.target_conflict": "メンバーとVCは同時に指定できません。",
  "user-response.target_not_voice": "ボイスチャンネルを指定してください。",
  "user-response.member_not_found": "対象のメンバーが見つかりませんでした。",
  "user-response.target_not_in_voice":
    "指定されたメンバーはボイスチャンネルにいません。",
  "user-response.channel_empty": "対象VCには誰もいません。",
  "user-response.channel_empty_now": "実行時点で対象VCには誰もいませんでした。",

  // ── embed: config_view ──────────────────────
  "embed.title.config_view": "AFK機能",
  "embed.field.name.channel": "AFKチャンネル",

  // ── action-log: 操作結果 Embed ───────────────
  "action-log.title.afk": "AFK移動",
  "action-log.field.invoker": "実行者",
  "action-log.field.target": "対象",
  "action-log.field.destination": "移動先",
  "action-log.field.failures": "失敗",
  "action-log.failures_more": "ほか {{count}} 件",
  "action-log.desc.afk_individual":
    "<@{{targetId}}> を <#{{destinationId}}> に移動しました。",
  "action-log.desc.afk_bulk":
    "<#{{channelId}}> の参加者全員を <#{{destinationId}}> に移動しました。",
  "action-log.audit.afk": "Botコマンド /afk による移動",

  // ── bulk-confirm: 一括操作の確認ダイアログ ──
  "bulk-confirm.title": "確認",
  "bulk-confirm.description":
    "<#{{channelId}}> の参加者全員に対して{{action}}を実行します。よろしいですか？",
  "bulk-confirm.action.afk": "AFKチャンネルへの移動",
  "bulk-confirm.field.target": "対象",
  "bulk-confirm.field.destination": "移動先",

  // ── UIラベル ─────────────────────────────────
  "ui.button.bulk_execute": "実行",

  // ── ログ ─────────────────────────────────────
  "log.moved":
    "ユーザーをAFKチャンネルに移動 GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}}",
  "log.bulk_executed":
    "VC一括操作を実行 GuildId: {{guildId}} Action: {{action}} ChannelId: {{channelId}} Count: {{count}} Failures: {{failures}}",
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
