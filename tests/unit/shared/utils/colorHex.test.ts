import { formatColorHex, parseColorHex } from "@/shared/utils/colorHex";

// カラーコード文字列と数値の相互変換。Discord が受け付ける 0〜0xFFFFFF の外の値を返さないことを検証
describe("shared/utils/colorHex", () => {
  describe("parseColorHex", () => {
    it.each([
      ["#RRGGBB", "#ff0000", 0xff0000],
      ["0xRRGGBB", "0x00ff00", 0x00ff00],
      ["0XRRGGBB（大文字 X）", "0X0000ff", 0x0000ff],
      ["接頭辞なし", "123456", 0x123456],
      ["大文字", "#ABCDEF", 0xabcdef],
      ["黒", "#000000", 0],
      ["白（上限）", "#FFFFFF", 0xffffff],
      ["前後の空白", "  #00A8F3  ", 0x00a8f3],
    ])("%s を数値にする", (_label, input, expected) => {
      expect(parseColorHex(input)).toBe(expected);
    });

    it.each([
      ["空文字", ""],
      ["16進数でない", "gggggg"],
      ["7桁（上限 #FFFFFF を超える）", "#1234567"],
      ["5桁", "#12345"],
      ["3桁の省略形", "#fff"],
      ["負の数", "-1"],
      ["途中から16進数でない", "12zz"],
      ["色の名前", "red"],
      ["# と 0x の重ね書き", "#0x123456"],
    ])("%s は null を返す", (_label, input) => {
      expect(parseColorHex(input)).toBeNull();
    });
  });

  describe("formatColorHex", () => {
    it("英字を大文字にして #RRGGBB 形式で返す", () => {
      expect(formatColorHex(0xabcdef)).toBe("#ABCDEF");
    });

    it("6桁に満たない値は先頭を 0 で埋める", () => {
      expect(formatColorHex(0x0000ff)).toBe("#0000FF");
    });

    it("0（黒）を #000000 にする", () => {
      expect(formatColorHex(0)).toBe("#000000");
    });

    it("parseColorHex に渡すと元の数値に戻る", () => {
      expect(parseColorHex(formatColorHex(0x008969))).toBe(0x008969);
    });
  });
});
