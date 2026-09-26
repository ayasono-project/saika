// 利用者が書く文面の `{name}` プレースホルダーを実値へ置換する

/**
 * 単一波括弧 `{name}` プレースホルダーを実値へ置換する。未知のプレースホルダーはそのまま残す。
 *
 * 置換は関数形式で行うため、値に `$&` / `` $` `` / `$'` / `$$` が含まれても
 * `String.prototype.replace` の特殊置換として展開されない（表示名やサーバー名は利用者が自由に設定できる）。
 * @param template プレースホルダー付きテンプレート文字列
 * @param vars プレースホルダー名と置換値の対応
 * @returns 置換済み文字列
 */
export function formatPlaceholders(
  template: string,
  vars: Readonly<Record<string, string | number>>,
): string {
  // vars 自身のキーだけを見る（`{constructor}` 等でプロトタイプ上の値を拾わない）
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : match,
  );
}
