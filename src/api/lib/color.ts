// ダッシュボードから届いたカラーコードの検査

import { COMMON_I18N_KEYS } from "../../bot/shared/i18nKeys";
import { tDefault } from "../../shared/locale/localeManager";
import { formatColorHex, parseColorHex } from "../../shared/utils/colorHex";
import { ApiHttpError } from "./httpError";

/**
 * リクエストのカラーコードを数値に変換する。
 * 読めない色を保存すると、Discord へ投稿するたびに Embed の組み立てで例外になるため、保存の前に弾く
 * @param color リクエストのカラーコード（`#RRGGBB` / `0xRRGGBB` / `RRGGBB` 形式）
 * @returns 数値カラーコード
 * @throws {ApiHttpError} カラーコードとして読めないとき（400）
 */
export function parseRequestColor(color: unknown): number {
  const parsed = typeof color === "string" ? parseColorHex(color) : null;
  if (parsed === null) {
    throw ApiHttpError.validation(tDefault(COMMON_I18N_KEYS.INVALID_COLOR));
  }
  return parsed;
}

/**
 * リクエストのカラーコードを、DB に持つ `#RRGGBB` の形にそろえる
 * @param color リクエストのカラーコード（`#RRGGBB` / `0xRRGGBB` / `RRGGBB` 形式）
 * @returns `#RRGGBB`（大文字）形式の文字列
 * @throws {ApiHttpError} カラーコードとして読めないとき（400）
 */
export function toStoredColorHex(color: unknown): string {
  return formatColorHex(parseRequestColor(color));
}
