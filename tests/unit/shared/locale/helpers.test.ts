// tests/unit/shared/locale/helpers.test.ts
import {
  getGuildTranslator,
  getInteractionTranslator,
  getTimezoneOffsetForLocale,
  invalidateGuildLocaleCache,
} from "@/shared/locale/helpers";

const getGuildTMock = vi.fn();
const getFixedTMock = vi.fn();
const invalidateLocaleCacheMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  localeManager: {
    getGuildT: (...args: unknown[]) => getGuildTMock(...args),
    getFixedT: (...args: unknown[]) => getFixedTMock(...args),
    invalidateLocaleCache: (...args: unknown[]) =>
      invalidateLocaleCacheMock(...args),
  },
  tInteraction: vi.fn((_l: string, k: string) => k),
}));

// locale helper の dynamic import 経路とキャッシュ無効化呼び出しを検証
describe("shared/locale/helpers", () => {
  // 各ケースでモック呼び出し履歴を独立化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // guild translator 取得時に localeManager.getGuildT を透過利用することを検証
  it("localeManager 経由でギルドトランスレーターを返すこと", async () => {
    const fixedT = vi.fn((key: string) => `translated:${key}`);
    getGuildTMock.mockResolvedValue(fixedT);

    const translator = await getGuildTranslator("guild-1");

    expect(getGuildTMock).toHaveBeenCalledWith("guild-1");
    expect(translator("system:bot.starting" as never)).toBe(
      "translated:system:bot.starting",
    );
  });

  // 追加パラメータなしで guild translator を解決できることを検証
  it("repository パラメータなしでトランスレーターを解決できること", async () => {
    const fixedT = vi.fn((key: string) => key);
    getGuildTMock.mockResolvedValue(fixedT);

    await getGuildTranslator("guild-2");

    expect(getGuildTMock).toHaveBeenCalledWith("guild-2");
  });

  // 明示的なキャッシュ無効化が対象 guildId に対して実行されることを検証
  it("指定 guildId のロケールキャッシュを無効化すること", async () => {
    await invalidateGuildLocaleCache("guild-3");

    expect(invalidateLocaleCacheMock).toHaveBeenCalledWith("guild-3");
  });

  describe("getInteractionTranslator", () => {
    it("locale が 'ja' の場合は日本語の固定トランスレーターを返すこと", async () => {
      const fixedT = vi.fn((key: string) => `ja:${key}`);
      getFixedTMock.mockReturnValue(fixedT);

      const translator = await getInteractionTranslator("ja");

      expect(getFixedTMock).toHaveBeenCalledWith("ja");
      expect(translator("system:bot.starting" as never)).toBe(
        "ja:system:bot.starting",
      );
    });

    it("locale が 'ja' 以外の場合は英語の固定トランスレーターを返すこと", async () => {
      const fixedT = vi.fn((key: string) => `en:${key}`);
      getFixedTMock.mockReturnValue(fixedT);

      const translator = await getInteractionTranslator("en-US");

      expect(getFixedTMock).toHaveBeenCalledWith("en");
      expect(translator("system:bot.starting" as never)).toBe(
        "en:system:bot.starting",
      );
    });
  });

  describe("getTimezoneOffsetForLocale", () => {
    it.each([
      ["ja", "+09:00"],
      ["ko", "+09:00"],
      ["zh-CN", "+08:00"],
      ["zh-TW", "+08:00"],
      ["zh-HK", "+08:00"],
      ["ru", "+03:00"],
      ["tr", "+03:00"],
      ["vi", "+07:00"],
      ["th", "+07:00"],
      ["id", "+07:00"],
      ["en-US", "+00:00"],
      ["en-GB", "+00:00"],
    ])("returns %s -> %s", (locale, expected) => {
      expect(getTimezoneOffsetForLocale(locale)).toBe(expected);
    });

    // Discord はタイムゾーンを公開しないため言語設定から代表値を推定する。
    // 未定義ロケールは UTC+0 にフォールバックし、日付表示がずれても許容する設計。
    it("未定義ロケールは UTC+0 にフォールバックする", () => {
      expect(getTimezoneOffsetForLocale("unknown-locale")).toBe("+00:00");
    });
  });
});
