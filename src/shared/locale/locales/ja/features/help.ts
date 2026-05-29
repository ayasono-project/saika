// src/shared/locale/locales/ja/features/help.ts
// Help機能の翻訳リソース

export const help = {
  // ── コマンド定義 ─────────────────────────────
  "help.description": "コマンド一覧を表示",

  // ── Embed ──────────────────────────────────────
  "embed.title.help": "📖 彩加 =Saika= コマンド一覧",
  "embed.description.help": "📚 詳しい使い方: {{url}}",
  "embed.field.name.basic": "🔧 基本",
  "embed.field.name.config": "⚙️ 設定（管理者）",
  "embed.field.name.action": "🛠️ 操作",
  "embed.field.value.basic":
    "`/ping` — Bot の応答速度を確認\n`/help` — このヘルプを表示",
  "embed.field.value.config":
    "`/guild-settings` — ギルド全体の設定\n`/afk-settings` — AFK の設定\n`/vac-settings` — VC自動作成の設定\n`/vc-recruit-settings` — VC募集の設定\n`/sticky-message` — メッセージ固定の設定\n`/member-log-settings` — メンバーログの設定\n`/message-delete-config` — メッセージ削除の設定\n`/bump-reminder-settings` — Bumpリマインダーの設定\n`/ticket-settings` — チケットシステムの設定\n`/reaction-role-settings` — リアクションロールの設定",
  "embed.field.value.action":
    "`/afk` — AFK チャンネルへ移動\n`/vc` — VC名・人数制限を変更\n`/message-delete` — メッセージを一括削除\n`/ticket` — チケットの操作（クローズ・オープン・削除）",
} as const;

export type HelpTranslations = typeof help;
