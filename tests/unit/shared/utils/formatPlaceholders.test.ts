import { formatPlaceholders } from "@/shared/utils/formatPlaceholders";

// formatPlaceholders の置換・未知キーの扱い・特殊置換シーケンスの無効化を検証
describe("shared/utils/formatPlaceholders", () => {
  it("単一波括弧プレースホルダーを文字列・数値の実値へ置換する", () => {
    expect(
      formatPlaceholders("{serverName} あと {remainingDays} 日", {
        serverName: "彩園",
        remainingDays: 2,
      }),
    ).toBe("彩園 あと 2 日");
  });

  it("同一プレースホルダーが複数あってもすべて置換する", () => {
    expect(formatPlaceholders("{userName}{userName}", { userName: "X" })).toBe(
      "XX",
    );
  });

  it("未知のプレースホルダーはそのまま残す", () => {
    expect(formatPlaceholders("{unknown}", {})).toBe("{unknown}");
  });

  it.each(["$&", "$`", "$'", "$$"])(
    "値に特殊置換シーケンス %s が含まれても展開せずそのまま出す",
    (value) => {
      expect(
        formatPlaceholders("前 {userName} 後", { userName: `a${value}b` }),
      ).toBe(`前 a${value}b 後`);
    },
  );

  it.each(["{constructor}", "{toString}", "{hasOwnProperty}"])(
    "vars に無いプロトタイプ上の名前 %s は置換せず残す",
    (template) => {
      expect(formatPlaceholders(template, { userName: "X" })).toBe(template);
    },
  );
});
