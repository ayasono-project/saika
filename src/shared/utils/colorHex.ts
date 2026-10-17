// カラーコード文字列（#RRGGBB）と数値の相互変換

/** カラーコードの基数（16進） */
const HEX_RADIX = 16;
/** `#RRGGBB` の桁数 */
const HEX_COLOR_DIGITS = 6;
/**
 * 受け付けるカラーコードの形（`#RRGGBB` / `0xRRGGBB` / `RRGGBB`）。
 * ちょうど6桁に限るので、Discord が受け付ける 0〜0xFFFFFF の外にはならない
 */
const COLOR_HEX_PATTERN = new RegExp(
  `^(?:#|0x)?([0-9a-f]{${HEX_COLOR_DIGITS}})$`,
  "i",
);

/**
 * カラーコード文字列を数値に変換する
 * @param input カラーコード文字列（`#RRGGBB` / `0xRRGGBB` / `RRGGBB` 形式。前後の空白は無視する）
 * @returns 数値カラーコード（形式が違うときは null）
 */
export function parseColorHex(input: string): number | null {
  const match = COLOR_HEX_PATTERN.exec(input.trim());
  return match ? Number.parseInt(match[1], HEX_RADIX) : null;
}

/**
 * 数値カラーコードを `#RRGGBB`（大文字）に変換する
 * @param color 数値カラーコード
 * @returns `#RRGGBB` 形式の文字列
 */
export function formatColorHex(color: number): string {
  return `#${color.toString(HEX_RADIX).toUpperCase().padStart(HEX_COLOR_DIGITS, "0")}`;
}
