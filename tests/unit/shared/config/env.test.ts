// tests/unit/shared/config/env.test.ts
/**
 * Environment Configuration Unit Tests
 * 環境変数設定のテスト
 */

describe("Environment Configuration", () => {
  // 必須/任意項目・型変換・列挙値の環境変数バリデーションを検証
  const originalEnv = { ...process.env };

  // process.env オブジェクトを差し替えず、キー単位で初期状態へ戻す
  const restoreEnv = () => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }
  };

  // 各テスト前にモジュールキャッシュを破棄し、環境変数を初期状態へ戻す
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
  });

  // テスト後に process.env を元に戻して副作用を防止
  afterEach(() => {
    restoreEnv();
  });

  describe("Required Fields", () => {
    it("有効な環境変数を正しくパースできること", async () => {
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "super-secret-key-for-production"; // 本番環境では必須

      const { env } = await import("@/shared/config/env");

      expect(env.DISCORD_TOKEN).toBe("a".repeat(50));
      expect(env.DISCORD_APP_ID).toBe("1234567890");
      expect(env.NODE_ENV).toBe("production");
    });

    it("任意項目を未設定にした場合にデフォルト値が適用されること", async () => {
      // 任意項目を未設定にし、デフォルト値の適用を確認
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      // NODE_ENVはsetup.tsで"test"に設定されている
      delete process.env.LOCALE;

      const { env } = await import("@/shared/config/env");

      expect(env.NODE_ENV).toBe("test"); // setup.tsで設定済み
      expect(env.LOCALE).toBe("ja");
      // LOG_LEVELはenv.tsのデフォルト値が適用される
      expect(["info", "error"]).toContain(env.LOG_LEVEL);
    });
  });

  describe("Enum Validation", () => {
    it("有効な NODE_ENV 値がすべて受け入れられること", async () => {
      const validEnvs = ["development", "production", "test"];

      // 有効な NODE_ENV 値を順番に検証
      for (const nodeEnv of validEnvs) {
        vi.resetModules();
        restoreEnv();
        process.env.DISCORD_TOKEN = "a".repeat(50);
        process.env.DISCORD_APP_ID = "1234567890";
        process.env.NODE_ENV = nodeEnv;
        // NODE_ENV = production だが JWT_SECRET なしでも起動できる（チェックは server.ts に委譲）
        if (nodeEnv === "production") {
          delete process.env.JWT_SECRET;
        }

        const { env } = await import("@/shared/config/env");
        expect(env.NODE_ENV).toBe(nodeEnv);
      }
    });

    it("有効な LOG_LEVEL 値がすべて受け入れられること", async () => {
      const validLevels = [
        "error",
        "warn",
        "info",
        "http",
        "verbose",
        "debug",
        "silly",
      ];

      // 有効な LOG_LEVEL 値を順番に検証
      for (const level of validLevels) {
        vi.resetModules();
        restoreEnv();
        process.env.DISCORD_TOKEN = "a".repeat(50);
        process.env.DISCORD_APP_ID = "1234567890";
        process.env.LOG_LEVEL = level;

        const { env } = await import("@/shared/config/env");
        expect(env.LOG_LEVEL).toBe(level);
      }
    });
  });

  describe("Optional Fields", () => {
    it("任意フィールド DISCORD_GUILD_ID が設定されたとき値を返すこと", async () => {
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      process.env.DISCORD_GUILD_ID = "9876543210";

      const { env } = await import("@/shared/config/env");

      expect(env.DISCORD_GUILD_ID).toBe("9876543210");
    });
  });

  describe("Database Configuration", () => {
    it("setup.ts で注入されるテスト用 DATABASE_URL が使用されること", async () => {
      // setup.ts で注入されるテスト用 DATABASE_URL を利用すること
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      // DATABASE_URLはsetup.tsで設定済み

      const { env } = await import("@/shared/config/env");

      expect(env.DATABASE_URL).toBe("file::memory:?cache=shared");
    });

    it("カスタムの DATABASE_URL を受け入れてそのまま返すこと", async () => {
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      process.env.DATABASE_URL = "file:./custom/path/db.sqlite";

      const { env } = await import("@/shared/config/env");

      expect(env.DATABASE_URL).toBe("file:./custom/path/db.sqlite");
    });
  });

  describe("Locale Configuration", () => {
    it("カスタムの LOCALE 値が受け入れられること", async () => {
      process.env.DISCORD_TOKEN = "a".repeat(50);
      process.env.DISCORD_APP_ID = "1234567890";
      process.env.LOCALE = "en";

      const { env } = await import("@/shared/config/env");

      expect(env.LOCALE).toBe("en");
    });
  });

  describe("Failure Paths", () => {
    it("ZodError 発生時にバリデーションエラーをログに記録して exit すること", async () => {
      // 必須の DISCORD_TOKEN / DISCORD_APP_ID を削除して ZodError を発生させる
      delete process.env.DISCORD_TOKEN;
      delete process.env.DISCORD_APP_ID;

      const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("EXIT");
      }) as never);
      // console.warn は問題なく通すため上書きしない
      vi.spyOn(console, "warn").mockImplementation(vi.fn());

      await expect(import("@/shared/config/env")).rejects.toThrow("EXIT");
      expect(errorSpy).toHaveBeenCalledWith(
        "❌ Environment variable validation failed:",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
