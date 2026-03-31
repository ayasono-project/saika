// tests/unit/shared/locale/localeManager.test.ts
import type { Mock } from "vitest";

const initMock: Mock = vi.fn();
const translateMock: Mock = vi.fn();
const getFixedTMock: Mock = vi.fn();

const loggerMock = {
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock("i18next", () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => initMock(...args),
    t: (...args: unknown[]) => translateMock(...args),
    getFixedT: (...args: unknown[]) => getFixedTMock(...args),
  },
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: loggerMock,
}));

// LocaleManager の初期化景筘・翻訳・ロケールキャッシュ・エラーハンドリング・
// シングルトンアクセサー機能を網羅的に検証するテスト群
describe("shared/locale/localeManager", () => {
  // vi.resetModules を使わずモックをクリアし、
  // 各テストでモック定義を初期値に戻すことでテスト間の翻訳・ init 呼び出しの影響を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    initMock.mockResolvedValue(undefined);
    translateMock.mockImplementation(
      (key: string, options?: { lng?: string }) =>
        `${options?.lng ?? "ja"}:${key}`,
    );
    getFixedTMock.mockImplementation(
      (locale: string) => (key: string) => `${locale}:${key}`,
    );
  });

  // Promise.all で同時呼び出ししても i18next.init が 1 回しか実行されないことを検証
  // (競合条件に対する冪等性のガード)
  it("同時呼び出しでも i18next を一度だけ初期化すること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");

    await Promise.all([manager.initialize(), manager.initialize()]);

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledTimes(1);
  });

  it("初期化済みの場合は initialize を呼び出しても即座に返ること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");

    await manager.initialize();
    await manager.initialize();

    expect(initMock).toHaveBeenCalledTimes(1);
  });

  // 初化失敗後にペンディング Promise がクリアされ、再呼び出しで正常に初期化できるリトライ動作を検証
  it("初期化失敗後にペンディング Promise をリセットしてリトライできること", async () => {
    const initializeError = new Error("init failed");
    initMock
      .mockRejectedValueOnce(initializeError)
      .mockResolvedValueOnce(undefined);

    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");

    await expect(manager.initialize()).rejects.toThrow("init failed");
    await expect(manager.initialize()).resolves.toBeUndefined();
    expect(initMock).toHaveBeenCalledTimes(2);
  });

  it("ギルドロケールをキャッシュして重複するリポジトリクエリを避けながら翻訳すること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");
    const repository = {
      getLocale: vi.fn().mockResolvedValue("en"),
    };

    manager.setRepository(repository as never);

    await expect(
      manager.translate("guild-1", "ping.description" as never),
    ).resolves.toBe("en:ping.description");
    await expect(
      manager.translate("guild-1", "afk.description" as never),
    ).resolves.toBe("en:afk.description");

    expect(repository.getLocale).toHaveBeenCalledTimes(1);
    expect(translateMock).toHaveBeenCalledWith(
      "ping.description",
      expect.objectContaining({ lng: "en" }),
    );
  });

  // サポート外ロケール(例: fr)や guildId なしケースでデフォルトロケール(ja)に
  // フォールバックすることと、追加オプション(value)が訳文呼び出しに引き継がれることを検証
  it("ギルドロケールが未サポートまたは guildId が未定義の場合はデフォルトロケールにフォールバックすること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");
    const repository = {
      getLocale: vi.fn().mockResolvedValue("fr"),
    };
    manager.setRepository(repository as never);

    await expect(
      manager.translate("guild-2", "ping.description" as never, { value: 1 }),
    ).resolves.toBe("ja:ping.description");
    await expect(
      manager.translate(undefined, "afk.description" as never),
    ).resolves.toBe("ja:afk.description");

    expect(translateMock).toHaveBeenCalledWith(
      "ping.description",
      expect.objectContaining({ lng: "ja", value: 1 }),
    );
  });

  it("repository が未設定の場合はデフォルトロケールを使用すること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");

    await expect(
      manager.translate("guild-no-repo", "ping.description" as never),
    ).resolves.toBe("ja:ping.description");
  });

  it("翻訳失敗時はキーを返してエラーをログに記録すること", async () => {
    translateMock
      .mockImplementationOnce(() => {
        throw new Error("translation-failed");
      })
      .mockImplementation(
        (key: string, options?: { lng?: string }) =>
          `${options?.lng ?? "ja"}:${key}`,
      );

    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");

    await expect(
      manager.translate("guild-3", "vac.description" as never),
    ).resolves.toBe("vac.description");
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("system:locale.translation_failed"),
      expect.any(Error),
    );
  });

  it("固定トランスレーターの取得・キャッシュ無効化・ロケールメタデータの公開が正しく機能すること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const { SUPPORTED_LOCALES } = await import("@/shared/locale/i18n");
    const manager = new LocaleManager("ja");
    const repository = {
      getLocale: vi.fn().mockResolvedValue("en"),
    };
    manager.setRepository(repository as never);

    const guildTranslator = await manager.getGuildT("guild-4");
    expect(typeof guildTranslator).toBe("function");
    expect(getFixedTMock).toHaveBeenCalledWith("en");

    manager.invalidateLocaleCache("guild-4");
    await manager.getGuildT("guild-4");
    expect(repository.getLocale).toHaveBeenCalledTimes(2);

    manager.getFixedT("ja");
    expect(getFixedTMock).toHaveBeenCalledWith("ja");
    expect(manager.getDefaultLocale()).toBe("ja");
    expect(manager.getSupportedLocales()).toBe(SUPPORTED_LOCALES);
    expect(manager.isSupported("ja")).toBe(true);
    expect(manager.isSupported("xx")).toBe(false);
  });

  it("getGuildT が guildId 未定義の場合はデフォルトロケールを使用すること", async () => {
    const { LocaleManager } = await import("@/shared/locale/localeManager");
    const manager = new LocaleManager("ja");
    const repository = {
      getLocale: vi.fn().mockResolvedValue("en"),
    };
    manager.setRepository(repository as never);

    const translator = await manager.getGuildT(undefined);

    expect(typeof translator).toBe("function");
    expect(getFixedTMock).toHaveBeenCalledWith("ja");
    expect(repository.getLocale).not.toHaveBeenCalled();
  });

  it("tGuild と tDefault がシングルトンマネージャー/i18next へ委譲すること", async () => {
    const module = await import("@/shared/locale/localeManager");

    const translateSpy = vi
      .spyOn(module.localeManager, "translate")
      .mockResolvedValue("guild-result");

    await expect(
      module.tGuild("guild-5", "ping.description" as never),
    ).resolves.toBe("guild-result");
    expect(translateSpy).toHaveBeenCalledWith(
      "guild-5",
      "ping.description",
      undefined,
    );

    const defaultText = module.tDefault("afk.description" as never, {
      value: 2,
    });
    expect(defaultText).toBe("ja:afk.description");
    expect(translateMock).toHaveBeenCalledWith(
      "afk.description",
      expect.objectContaining({ lng: "ja", value: 2 }),
    );
  });

  describe("tInteraction", () => {
    it("locale が 'ja' の場合は日本語で翻訳すること", async () => {
      const module = await import("@/shared/locale/localeManager");

      const result = module.tInteraction("ja", "ping.description" as never);

      expect(result).toBe("ja:ping.description");
      expect(translateMock).toHaveBeenCalledWith(
        "ping.description",
        expect.objectContaining({ lng: "ja" }),
      );
    });

    it("locale が 'ja' 以外の場合は英語にフォールバックすること", async () => {
      const module = await import("@/shared/locale/localeManager");

      const result = module.tInteraction("en-US", "ping.description" as never);

      expect(result).toBe("en:ping.description");
      expect(translateMock).toHaveBeenCalledWith(
        "ping.description",
        expect.objectContaining({ lng: "en" }),
      );
    });

    it("params が渡された場合はオプションにマージされること", async () => {
      const module = await import("@/shared/locale/localeManager");

      module.tInteraction("ja", "ping.description" as never, { count: 3 });

      expect(translateMock).toHaveBeenCalledWith(
        "ping.description",
        expect.objectContaining({ lng: "ja", count: 3 }),
      );
    });

    it("params が未指定の場合は lng のみのオプションで翻訳すること", async () => {
      const module = await import("@/shared/locale/localeManager");

      module.tInteraction("ko", "afk.description" as never);

      expect(translateMock).toHaveBeenCalledWith("afk.description", {
        lng: "en",
      });
    });
  });
});
