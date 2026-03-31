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
    "`/guild-config` — Guild settings\n`/afk-config` — AFK settings\n`/vac-config` — Auto VC creation settings\n`/vc-recruit-config` — VC recruitment settings\n`/sticky-message` — Sticky message settings\n`/member-log-config` — Member log settings\n`/message-delete-config` — Message delete settings\n`/bump-reminder-config` — Bump reminder settings\n`/ticket-config` — Ticket system settings\n`/reaction-role-config` — Reaction role settings",
  "embed.field.value.action":
    "`/afk` — Move to AFK channel\n`/vc` — Change VC name or user limit\n`/message-delete` — Bulk delete messages\n`/ticket` — Ticket operations (close, open, delete)",
} as const;

export type HelpTranslations = typeof help;
