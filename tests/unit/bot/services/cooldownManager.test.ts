// tests/unit/bot/services/cooldownManager.test.ts
/**
 * CooldownManager Unit Tests
 * コマンドクールダウン管理のテスト
 */

import { CooldownManager } from "@/bot/services/cooldownManager";
import { logger } from "@/shared/utils/logger";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
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
  tDefault: (key: string, params?: Record<string, unknown>) =>
    `${key}:${JSON.stringify(params || {})}`,
  tInteraction: (...args: unknown[]) => args[1],
}));

describe("CooldownManager", () => {
  // クールダウン登録・解除・統計・クリーンアップ挙動を検証
  let cooldownManager: CooldownManager;

  // 各テストで新しいインスタンスを作り、モック履歴を初期化
  beforeEach(() => {
    // 実時間待機を排除してテストを安定化
    vi.useFakeTimers();
    cooldownManager = new CooldownManager();
    vi.clearAllMocks();
  });

  // テスト後にインスタンス破棄とタイマー掃除を実施
  afterEach(() => {
    if (cooldownManager) {
      cooldownManager.destroy();
    }
    // すべてのタイマーをクリア
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  afterAll(() => {
    // テストスイート終了時に残っているタイマーをクリア
    vi.clearAllTimers();
  });

  describe("check()", () => {
    it("クールダウンが未設定の場合は 0 が返されることを確認", () => {
      const remaining = cooldownManager.check("testCommand", "user123", 10);
      expect(remaining).toBe(0);
    });

    it("クールダウン中は残り時間が返されることを確認", () => {
      // 先に実行してクールダウン状態を作る
      cooldownManager.check("testCommand", "user123", 5);

      // 1秒経過させて残り時間を確認
      vi.advanceTimersByTime(1000);

      const remaining = cooldownManager.check("testCommand", "user123", 5);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(4);
    });

    it("クールダウン期限切れ後はコマンドが実行可能になることを確認", () => {
      cooldownManager.check("testCommand", "user123", 1);

      // クールダウン期間 + バッファ分を進める
      vi.advanceTimersByTime(1100);

      const remaining = cooldownManager.check("testCommand", "user123", 1);
      expect(remaining).toBe(0);
    });

    it("ユーザーごとに独立したクールダウンが管理されることを確認", () => {
      // ユーザーごとに独立したクールダウンであること
      cooldownManager.check("testCommand", "user1", 10);
      cooldownManager.check("testCommand", "user2", 10);

      const remaining1 = cooldownManager.check("testCommand", "user1", 10);
      const remaining2 = cooldownManager.check("testCommand", "user2", 10);

      expect(remaining1).toBeGreaterThan(0);
      expect(remaining2).toBeGreaterThan(0);
    });

    it("コマンドごとに独立したクールダウンが管理されることを確認", () => {
      // コマンドごとに独立したクールダウンであること
      cooldownManager.check("command1", "user123", 10);
      cooldownManager.check("command2", "user123", 10);

      const remaining1 = cooldownManager.check("command1", "user123", 10);
      const remaining2 = cooldownManager.check("command2", "user123", 10);

      expect(remaining1).toBeGreaterThan(0);
      expect(remaining2).toBeGreaterThan(0);
    });

    it("クールダウンエントリを再設定する際に既存タイマーがクリアされることを確認", () => {
      cooldownManager.check("testCommand", "user123", 0);

      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      cooldownManager.check("testCommand", "user123", 0);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("古いタイマーコールバックが実行されても新しいクールダウンが保持されることを確認", () => {
      cooldownManager.check("testCommand", "user123", 1);

      const managerInternals = cooldownManager as unknown as {
        cooldowns: Map<string, Map<string, number>>;
      };
      managerInternals.cooldowns
        .get("testCommand")
        ?.set("user123", Date.now() + 60_000);

      vi.advanceTimersByTime(1100);

      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(1);
      expect(stats.totalUsers).toBe(1);
    });
  });

  describe("reset()", () => {
    it("指定ユーザーのクールダウンがリセットされることを確認", () => {
      cooldownManager.check("testCommand", "user123", 10);

      cooldownManager.reset("testCommand", "user123");

      const remaining = cooldownManager.check("testCommand", "user123", 10);
      expect(remaining).toBe(0);
    });

    it("他ユーザーのクールダウンに影響しないことを確認", () => {
      // 指定ユーザーのみ解除し、他ユーザーは維持されること
      cooldownManager.check("testCommand", "user1", 10);
      cooldownManager.check("testCommand", "user2", 10);

      cooldownManager.reset("testCommand", "user1");

      const remaining1 = cooldownManager.check("testCommand", "user1", 10);
      const remaining2 = cooldownManager.check("testCommand", "user2", 10);

      expect(remaining1).toBe(0);
      expect(remaining2).toBeGreaterThan(0);
    });

    it("タイマーが存在しない場合でも reset が例外を投げないことを確認", () => {
      expect(() => cooldownManager.reset("unknown", "user123")).not.toThrow();
    });
  });

  describe("clearCommand()", () => {
    it("コマンドの全クールダウンがクリアされることを確認", () => {
      cooldownManager.check("testCommand", "user1", 10);
      cooldownManager.check("testCommand", "user2", 10);
      cooldownManager.check("testCommand", "user3", 10);

      cooldownManager.clearCommand("testCommand");

      expect(cooldownManager.check("testCommand", "user1", 10)).toBe(0);
      expect(cooldownManager.check("testCommand", "user2", 10)).toBe(0);
      expect(cooldownManager.check("testCommand", "user3", 10)).toBe(0);
    });

    it("他のコマンドのクールダウンに影響しないことを確認", () => {
      cooldownManager.check("command1", "user123", 10);
      cooldownManager.check("command2", "user123", 10);

      cooldownManager.clearCommand("command1");

      expect(cooldownManager.check("command1", "user123", 10)).toBe(0);
      expect(cooldownManager.check("command2", "user123", 10)).toBeGreaterThan(
        0,
      );
    });

    it("タイマーマップが存在しない場合でも clearCommand が例外を投げないことを確認", () => {
      expect(() => cooldownManager.clearCommand("unknown")).not.toThrow();
    });
  });

  describe("clearAll()", () => {
    it("全クールダウンがクリアされることを確認", () => {
      cooldownManager.check("command1", "user1", 10);
      cooldownManager.check("command1", "user2", 10);
      cooldownManager.check("command2", "user1", 10);

      cooldownManager.clearAll();

      expect(cooldownManager.check("command1", "user1", 10)).toBe(0);
      expect(cooldownManager.check("command1", "user2", 10)).toBe(0);
      expect(cooldownManager.check("command2", "user1", 10)).toBe(0);
    });
  });

  describe("cleanup()", () => {
    it("期限切れのクールダウンが削除されることを確認", () => {
      // 短期/長期を混在させ、期限切れのみ削除されることを確認
      cooldownManager.check("testCommand", "user1", 1);
      cooldownManager.check("testCommand", "user2", 10);

      // 短いクールダウンのみ期限切れにする
      vi.advanceTimersByTime(1100);

      cooldownManager.cleanup();

      const stats = cooldownManager.getStats();
      expect(stats.totalUsers).toBe(1); // user2 のみ残る
    });

    it("クールダウンが空の場合でも cleanup が正常終了することを確認", () => {
      cooldownManager.cleanup();
      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });

    it("期限切れエントリを削除し空コマンドマップを除去してクリーンアップ件数をログ出力することを確認", () => {
      const managerInternals = cooldownManager as unknown as {
        cooldowns: Map<string, Map<string, number>>;
      };
      managerInternals.cooldowns.set(
        "expiredCommand",
        new Map([["expiredUser", Date.now() - 1000]]),
      );

      cooldownManager.cleanup();

      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith(
        '[system:log_prefix.cooldown] system:cooldown.cleanup:{"count":1}',
      );
    });
  });

  describe("getStats()", () => {
    it("正しい統計情報が返されることを確認", () => {
      cooldownManager.check("command1", "user1", 10);
      cooldownManager.check("command1", "user2", 10);
      cooldownManager.check("command2", "user1", 10);

      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(2);
      expect(stats.totalUsers).toBe(3);
    });

    it("クールダウンが空の場合は統計情報がゼロになることを確認", () => {
      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });
  });

  describe("destroy()", () => {
    it("全クールダウンがクリアされクリーンアップインターバルが停止されることを確認", () => {
      // destroy 呼び出しで内部状態が完全にクリアされること
      cooldownManager.check("testCommand", "user123", 10);

      cooldownManager.destroy();

      const stats = cooldownManager.getStats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });
  });

  describe("Memory Leak Prevention", () => {
    it("期限切れのクールダウンが自動的に削除されることを確認", () => {
      cooldownManager.check("testCommand", "user123", 1);

      const initialStats = cooldownManager.getStats();
      expect(initialStats.totalUsers).toBe(1);

      // クールダウン期限 + バッファ分を進める
      vi.advanceTimersByTime(1100);

      const finalStats = cooldownManager.getStats();
      expect(finalStats.totalUsers).toBe(0);
    });

    it("定期インターバルコールバックにより cleanup が呼ばれることを確認", () => {
      const cleanupSpy = vi.spyOn(cooldownManager, "cleanup");

      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
