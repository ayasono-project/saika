// src/shared/locale/locales/ja/features/vc.ts
// VC操作コマンド（/vc rename, /vc limit）の翻訳リソース

export const vc = {
  // ── コマンド定義 ─────────────────────────────
  "vc.description": "VCの設定を変更",
  "vc.rename.description": "参加中のVC名を変更",
  "vc.rename.name.description": "新しいVC名",
  "vc.limit.description": "参加中VCの人数制限を変更",
  "vc.limit.limit.description": "人数制限（0=無制限、0~99）",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.renamed": "VC名を {{name}} に変更しました。",
  "user-response.limit_changed": "人数制限を {{limit}} に設定しました。",
  "user-response.unlimited": "無制限",
  "user-response.not_in_any_vc": "このコマンドはVC参加中にのみ使用できます。",
  "user-response.not_managed_channel":
    "このVCはBot管理のチャンネルではありません。",
  "user-response.limit_out_of_range":
    "人数制限は0〜99の範囲で指定してください。",
} as const;

export type VcTranslations = typeof vc;
