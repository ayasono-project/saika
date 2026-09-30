import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/shared/locale/i18n";

// i18n モジュールのロケール定数を検証する
describe("shared/locale/i18n", () => {
  it("サポート済みロケール定数とデフォルトロケール定数をエクスポートすること", () => {
    expect(SUPPORTED_LOCALES).toEqual(["ja", "en"]);
    expect(DEFAULT_LOCALE).toBe("ja");
  });
});
