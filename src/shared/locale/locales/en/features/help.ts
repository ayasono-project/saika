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
    "`/guild-settings` — Guild settings\n`/afk-settings` — AFK settings\n`/vac-settings` — Auto VC creation settings\n`/vc-recruit-settings` — VC recruitment settings\n`/sticky-message` — Sticky message settings\n`/member-log-settings` — Member log settings\n`/bump-reminder-settings` — Bump reminder settings\n`/ticket-settings` — Ticket system settings\n`/reaction-role-settings` — Reaction role settings\n`/inactive-kick-settings` — Inactive member auto-kick settings",
  "embed.field.value.action":
    "`/afk` — Move to AFK channel\n`/vc` — Change VC name or user limit\n`/message-delete` — Bulk delete messages\n`/ticket` — Ticket operations (close, open, delete)",
} as const;

export type HelpTranslations = typeof help;
