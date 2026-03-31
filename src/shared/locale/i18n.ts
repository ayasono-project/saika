// src/shared/locale/i18n.ts
// i18next設定ファイル

import type { i18n as I18nInstance, ParseKeys } from "i18next";
import i18next from "i18next";
import { env, NODE_ENV } from "../config/env";

/**
 * サポートする言語
 */
export const SUPPORTED_LOCALES = ["ja", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * デフォルト言語
 */
export const DEFAULT_LOCALE: SupportedLocale = "ja";

/**
 * 全翻訳ネームスペース一覧
 */
export const I18N_NAMESPACES = [
  "common",
  "system",
  "ping",
  "help",
  "afk",
  "bumpReminder",
  "vac",
  "vc",
  "messageDelete",
  "memberLog",
  "reactionRole",
  "stickyMessage",
  "ticket",
  "vcRecruit",
  "guildConfig",
] as const;

/**
 * 全翻訳ネームスペース
 */
export type AllNamespaces = typeof I18N_NAMESPACES;

/**
 * 全ネームスペースにまたがる翻訳キー型
 * t() / tDefault() の引数型として使用
 */

export type AllParseKeys = ParseKeys<AllNamespaces>;

/**
 * i18nextインスタンスの初期化
 */
export const initI18n = async (): Promise<I18nInstance> => {
  // i18next を最小構成で初期化（リソースは後段で注入）
  await i18next.init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    debug: env.NODE_ENV === NODE_ENV.DEVELOPMENT,

    // リソースをコード内で直接管理（ファイルシステム不要）
    resources: {},

    interpolation: {
      escapeValue: false,
    },

    // ドットをキーセパレーターとして使わない（フラットキー形式）
    keySeparator: false,

    // 名前空間設定
    ns: [...I18N_NAMESPACES],
    defaultNS: "common",
  });

  return i18next;
};

/**
 * 翻訳リソースを追加
 */
export const addResources = (
  locale: SupportedLocale,
  namespace: string,
  resources: Record<string, string>,
): void => {
  // 既存バンドルへ追記/上書き可能な設定で登録
  i18next.addResourceBundle(locale, namespace, resources, true, true);
};

/**
 * 言語を切り替え
 */
export const changeLanguage = async (
  locale: SupportedLocale,
): Promise<void> => {
  // ランタイム言語を切り替え
  await i18next.changeLanguage(locale);
};

/**
 * 翻訳関数のエクスポート
 */
export const t: typeof i18next.t = i18next.t.bind(i18next);

export default i18next;
