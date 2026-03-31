// src/shared/locale/locales/ja/features/ping.ts
// Ping機能の翻訳リソース

export const ping = {
  // ── コマンド定義 ─────────────────────────────
  "ping.description": "ボットの応答速度を確認",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.measuring": "🏓 計測中...",
  "user-response.result":
    "📡 API レイテンシー: **{{apiLatency}}ms**\n💓 WebSocket Ping: **{{wsLatency}}ms**",
} as const;

export type PingTranslations = typeof ping;
