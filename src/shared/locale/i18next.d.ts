// src/shared/locale/i18next.d.ts
// i18next型定義の拡張

import "i18next";
import type { TranslationResources } from "./locales/resources";

declare module "i18next" {
  interface CustomTypeOptions {
    // デフォルトの名前空間
    defaultNS: "common";

    // リソースの型定義
    // ja を基準型にすることで全言語のキー整合を担保する
    resources: TranslationResources["ja"];

    // 翻訳キーの型安全性を有効化
    returnNull: false;

    // ドットをキーセパレーターとして使わない（フラットキー形式に対応）
    keySeparator: false;
  }
}
