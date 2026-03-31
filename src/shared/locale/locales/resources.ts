// src/shared/locale/locales/resources.ts
// すべての翻訳リソースのエクスポート

import { en } from "./en/resources";
import { ja } from "./ja/resources";

export const resources: {
  ja: typeof ja;
  en: typeof en;
} = {
  ja,
  en,
};

export type TranslationResources = typeof resources;
