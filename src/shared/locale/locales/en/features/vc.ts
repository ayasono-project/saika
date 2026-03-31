// src/shared/locale/locales/en/features/vc.ts
// VC command (/vc rename, /vc limit) translations (English)

export const vc = {
  // ── Command definitions ──────────────────────
  "vc.description": "Change VC settings",
  "vc.rename.description": "Rename your current VC",
  "vc.rename.name.description": "New VC name",
  "vc.limit.description": "Change user limit of your current VC",
  "vc.limit.limit.description": "User limit (0=unlimited, max 99)",

  // ── User responses ───────────────────────────
  "user-response.renamed": "VC name has been changed to {{name}}",
  "user-response.limit_changed": "User limit has been set to {{limit}}",
  "user-response.unlimited": "unlimited",
  "user-response.not_in_any_vc":
    "You must be in a voice channel to use this command.",
  "user-response.not_managed_channel":
    "This voice channel is not managed by the Bot.",
  "user-response.limit_out_of_range": "User limit must be between 0 and 99.",
} as const;

export type VcTranslations = typeof vc;
