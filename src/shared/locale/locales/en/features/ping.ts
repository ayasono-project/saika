// src/shared/locale/locales/en/features/ping.ts
// Ping feature translations (English)

export const ping = {
  // ── Command definitions ──────────────────────
  "ping.description": "Check bot response speed",

  // ── User responses ───────────────────────────
  "user-response.measuring": "🏓 Measuring...",
  "user-response.result":
    "📡 API Latency: **{{apiLatency}}ms**\n💓 WebSocket Ping: **{{wsLatency}}ms**",
} as const;

export type PingTranslations = typeof ping;
