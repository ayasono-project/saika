// tests/unit/shared/utils/serviceFactory.test.ts

import {
  createBotServiceAccessor,
  createServiceGetter,
} from "@/shared/utils/serviceFactory";

// createBotServiceAccessor / createServiceGetter のキャッシュ・例外・再生成ロジックを検証
describe("shared/utils/serviceFactory", () => {
  // createBotServiceAccessor: 未初期化例外・setter 後の正常取得を検証
  describe("createBotServiceAccessor", () => {
    it("setter で値を登録する前に getter を呼ぶと例外が発生する", () => {
      const [getter] = createBotServiceAccessor<string>("TestService");

      expect(() => getter()).toThrow(
        "TestService is not initialized. Initialize in composition root first.",
      );
    });

    it("setter で値を登録した後は getter が登録値を返す", () => {
      const [getter, setter] = createBotServiceAccessor<string>("TestService");

      setter("hello");
      expect(getter()).toBe("hello");
    });

    it("setter で値を上書きすると getter が新しい値を返す", () => {
      const [getter, setter] = createBotServiceAccessor<string>("TestService");

      setter("first");
      setter("second");
      expect(getter()).toBe("second");
    });
  });

  // createServiceGetter: キャッシュ再利用・リポジトリ差し替え時の再生成を検証
  describe("createServiceGetter", () => {
    it("引数なしで呼ぶとデフォルトリポジトリでサービスを生成してキャッシュする", () => {
      const createFn = vi.fn((repo: string) => `service-${repo}`);
      const getDefaultRepo = vi.fn(() => "defaultRepo");

      const getService = createServiceGetter(createFn, getDefaultRepo);

      const result1 = getService();
      const result2 = getService();

      expect(result1).toBe("service-defaultRepo");
      expect(result2).toBe(result1);
      expect(createFn).toHaveBeenCalledTimes(1);
      expect(getDefaultRepo).toHaveBeenCalledTimes(2);
    });

    it("明示的にリポジトリを渡すとそのリポジトリでサービスを生成する", () => {
      const createFn = vi.fn((repo: string) => `service-${repo}`);
      const getDefaultRepo = vi.fn(() => "defaultRepo");

      const getService = createServiceGetter(createFn, getDefaultRepo);

      const result = getService("customRepo");

      expect(result).toBe("service-customRepo");
      expect(createFn).toHaveBeenCalledWith("customRepo");
      expect(getDefaultRepo).not.toHaveBeenCalled();
    });

    it("異なるリポジトリを渡すとサービスを再生成する", () => {
      const createFn = vi.fn((repo: string) => `service-${repo}`);
      const getDefaultRepo = vi.fn(() => "defaultRepo");

      const getService = createServiceGetter(createFn, getDefaultRepo);

      const result1 = getService("repoA");
      const result2 = getService("repoB");

      expect(result1).toBe("service-repoA");
      expect(result2).toBe("service-repoB");
      expect(createFn).toHaveBeenCalledTimes(2);
    });

    it("同じリポジトリを渡すとキャッシュ済みサービスを返す", () => {
      const createFn = vi.fn((repo: string) => `service-${repo}`);
      const getDefaultRepo = vi.fn(() => "defaultRepo");

      const getService = createServiceGetter(createFn, getDefaultRepo);

      const result1 = getService("repoA");
      const result2 = getService("repoA");

      expect(result1).toBe(result2);
      expect(createFn).toHaveBeenCalledTimes(1);
    });
  });
});
