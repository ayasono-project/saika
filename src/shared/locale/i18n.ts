// ロケール・翻訳ネームスペースの定数と型定義

import type { ParseKeys } from "i18next";

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
  "about",
  "ping",
  "help",
  "afk",
  "bumpReminder",
  "vac",
  "vcAutoRecruit",
  "messageDelete",
  "memberLog",
  "unverifiedKick",
  "reactionRole",
  "stickyMessage",
  "ticket",
  "guildSettings",
] as const;

/**
 * 全翻訳ネームスペース
 */
export type AllNamespaces = typeof I18N_NAMESPACES;

/**
 * 全ネームスペースにまたがる翻訳キー型
 * tDefault() などの引数型として使用
 */

export type AllParseKeys = ParseKeys<AllNamespaces>;
