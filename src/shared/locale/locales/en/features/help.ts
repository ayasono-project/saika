// src/shared/locale/locales/en/features/help.ts
// Help feature translations (English)

export const help = {
  // ── Command definitions ──────────────────────
  "help.description": "Show command list",

  // ── Embed ──────────────────────────────────────
  "embed.title.help": "📖 彩加 =Saika= Commands",
  "embed.description.help": "📚 Learn more: {{url}}",
  "embed.field.name.basic": "🔧 Basic",
  "embed.field.name.config": "⚙️ Settings (Admin)",
  "embed.field.name.action": "🛠️ Actions",
  "embed.field.value.basic":
    "`/ping` — Check bot response speed\n`/help` — Show this help",
  "embed.field.value.config":
    "`/guild-settings` — Guild settings\n`/afk-settings` — AFK settings\n`/vac-settings` — Auto VC creation settings\n`/vc-recruit-settings` — VC recruitment settings\n`/vc-auto-recruit-settings` — VC auto recruit settings\n`/sticky-message` — Sticky message settings\n`/member-log-settings` — Member log settings\n`/bump-reminder-settings` — Bump reminder settings\n`/ticket-settings` — Ticket system settings\n`/reaction-role-settings` — Reaction role settings\n`/inactive-kick-settings` — Inactive member auto-kick settings\n`/unverified-kick-settings` — Unverified member auto-kick settings",
  "embed.field.value.action":
    "`/afk` — Move yourself or others to the AFK channel\n`/vc` — Rename / set user limit, disconnect or move members\n`/message-delete` — Bulk delete messages\n`/ticket` — Ticket operations (close, open, delete)",
  "embed.field.name.dashboard": "🌐 Dashboard",
  "embed.field.value.dashboard": "Manage settings in your browser: {{url}}",
} as const;

export type HelpTranslations = typeof help;
