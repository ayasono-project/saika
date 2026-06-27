// src/shared/locale/locales/ja/features/about.ts
// About機能の翻訳リソース

export const about = {
  // ── コマンド定義 ─────────────────────────────
  "about.description": "Bot の情報（バージョン・公式リンク）を表示",

  // ── Embed ──────────────────────────────────────
  "embed.title": "🌸 彩加 =Saika= について",
  "embed.description":
    "出来ないこと以外は何でも出来る！コミュニティに彩りを加えるサーバー管理 Bot「彩加 =Saika=」",
  "embed.field.name.version": "バージョン",
  "embed.field.name.official": "🔗 公式サイト",
  "embed.field.value.official": "{{url}}",
} as const;

export type AboutTranslations = typeof about;
