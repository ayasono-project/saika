// src/shared/locale/locales/en/features/about.ts
// About feature translations (English)

export const about = {
  // ── Command definitions ──────────────────────
  "about.description": "Show bot info (version and official links)",

  // ── Embed ──────────────────────────────────────
  "embed.title": "🌸 About 彩加 =Saika=",
  "embed.description": "彩加 =Saika= — Discord server management bot",
  "embed.field.name.version": "Version",
  "embed.field.name.official": "🔗 Official site",
  "embed.field.value.official": "{{url}}",
} as const;

export type AboutTranslations = typeof about;
