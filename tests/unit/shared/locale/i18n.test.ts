// tests/unit/shared/locale/i18n.test.ts
// i18n モジュールの初期化設定（ロケール定数・i18next オプション・debug フラグ）と
// addResources / changeLanguage / t のラッパーが i18next に正しく委譲するかを検証する
describe("shared/locale/i18n", () => {
  const loadModule = async (nodeEnv: "development" | "production" | "test") => {
    vi.resetModules();

    const i18nextMock = {
      init: vi.fn().mockResolvedValue(undefined),
      addResourceBundle: vi.fn(),
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      t: vi.fn((key: string) => `translated:${key}`),
    };

    vi.doMock("i18next", () => ({
      __esModule: true,
      default: i18nextMock,
    }));

    vi.doMock("@/shared/config/env", () => ({
      NODE_ENV: {
        DEVELOPMENT: "development",
        PRODUCTION: "production",
        TEST: "test",
      },
      env: {
        NODE_ENV: nodeEnv,
      },
    }));

    const module = await import("@/shared/locale/i18n");
    return { module, i18nextMock };
  };

  it("サポート済みロケール定数とデフォルトロケール定数をエクスポートすること", async () => {
    const { module } = await loadModule("test");

    expect(module.SUPPORTED_LOCALES).toEqual(["ja", "en"]);
    expect(module.DEFAULT_LOCALE).toBe("ja");
  });

  // 環境ごとに debug フラグが切り替わることを確認（development のみ true）
  it.each([
    ["development" as const, true],
    ["production" as const, false],
    ["test" as const, false],
  ])("%s 環境では debug=%s が設定されること", async (nodeEnv, expectedDebug) => {
    const { module, i18nextMock } = await loadModule(nodeEnv);
    await module.initI18n();

    expect(i18nextMock.init).toHaveBeenCalledWith(
      expect.objectContaining({ debug: expectedDebug }),
    );
  });

  // addResources が merge フラグ付きで addResourceBundle を呼び出し、changeLanguage が委譲されることを確認
  it("addResources と changeLanguage が i18next へ委譲されること", async () => {
    const { module, i18nextMock } = await loadModule("test");

    module.addResources("ja", "commands", { "ping.description": "ピング" });
    expect(i18nextMock.addResourceBundle).toHaveBeenCalledWith(
      "ja",
      "commands",
      { "ping.description": "ピング" },
      true,
      true,
    );

    await module.changeLanguage("en");
    expect(i18nextMock.changeLanguage).toHaveBeenCalledWith("en");
  });

  it("バインドされたトランスレーター関数をエクスポートすること", async () => {
    const { module, i18nextMock } = await loadModule("test");

    expect(module.t("ping.description" as never)).toBe(
      "translated:ping.description",
    );
    expect(i18nextMock.t).toHaveBeenCalledWith("ping.description");
  });
});
