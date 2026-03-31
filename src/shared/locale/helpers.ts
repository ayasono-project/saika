// src/shared/locale/helpers.ts
// ローカライゼーション関連のヘルパー関数

import { type ParseKeys } from "i18next";
import { type AllNamespaces, type SupportedLocale } from "./i18n";

/** 全ネームスペースの翻訳キーを受け取るギルド用翻訳関数型 */
export type GuildTFunction = (
  key: ParseKeys<AllNamespaces>,
  options?: Record<string, unknown>,
) => string;

/**
 * ギルド用の翻訳関数を取得
 * LocaleManager 経由でキャッシュを利用するため、直接 DB クエリを発行しない
 * @param guildId ギルドID
 * @returns 翻訳関数
 */
export async function getGuildTranslator(
  guildId: string,
): Promise<GuildTFunction> {
  // 循環依存を避けるため遅延 import で localeManager を取得
  const { localeManager } = await import("./localeManager");
  // guildId に対応する固定 translator（ロケール解決済み）を取得
  const fixedT = await localeManager.getGuildT(guildId);
  // i18next 側の型より実運用側（全NSキー許容）が広いため型を合わせる
  return fixedT as unknown as GuildTFunction;
}

/**
 * interaction.locale ベースの翻訳関数を取得
 * コマンド・UIハンドラでユーザー応答を翻訳する際に使用
 * @param locale interaction.locale の値
 * @returns 翻訳関数（同期）
 */
export async function getInteractionTranslator(
  locale: string,
): Promise<GuildTFunction> {
  // 循環依存を避けるため遅延 import で localeManager を取得
  const { localeManager } = await import("./localeManager");
  const resolvedLocale: SupportedLocale = locale === "ja" ? "ja" : "en";
  return localeManager.getFixedT(resolvedLocale) as unknown as GuildTFunction;
}

/**
 * ギルドのロケールを取得して LocaleManager キャッシュを更新させる
 * ロケール設定変更後に呼び出すことでキャッシュを無効化する
 */
export async function invalidateGuildLocaleCache(
  guildId: string,
): Promise<void> {
  // 循環依存を避けるため localeManager を遅延 import
  const { localeManager } = await import("./localeManager");
  // 対象 guild のロケールキャッシュだけを破棄（他ギルドへ影響させない）
  localeManager.invalidateLocaleCache(guildId);
}

/**
 * Discord のロケール文字列からタイムゾーンオフセット文字列を返す。
 * Discord は言語設定のみを公開しており、タイムゾーンは取得不可能なため
 * 言語から代表的なオフセットを推定する。特定不可能なロケールは UTC にフォールバックする。
 *
 * 将来 GuildConfig にタイムゾーン設定が追加された場合は、
 * `guildTimezone ?? getTimezoneOffsetForLocale(locale)` で差し替え可能。
 *
 * @param locale Discord の interaction.locale または guildLocale
 * @returns UTC オフセット文字列（例: "+09:00", "+00:00"）
 */
export function getTimezoneOffsetForLocale(locale: string): string {
  switch (locale) {
    case "ja":
      return "+09:00"; // JST (Japan)
    case "ko":
      return "+09:00"; // KST (Korea)
    case "zh-CN":
      return "+08:00"; // CST (China)
    case "zh-TW":
    case "zh-HK":
      return "+08:00"; // CST (Taiwan/HongKong)
    case "ru":
      return "+03:00"; // MSK (Moscow, 主要都市)
    case "tr":
      return "+03:00"; // TRT (Turkey)
    case "vi":
      return "+07:00"; // ICT (Vietnam)
    case "th":
      return "+07:00"; // ICT (Thailand)
    case "id":
      return "+07:00"; // WIB (Indonesia 西部)
    default:
      return "+00:00"; // UTC (en-US 等は地域分散のためフォールバック)
  }
}

export type { SupportedLocale };
