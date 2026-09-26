import type { Mock } from "vitest";

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
}));

import { GuildSettingsService } from "@/features/guild-settings/guildSettingsService";

// GuildSettingsService のビジネスロジックを検証
describe("shared/features/guild-settings/guildSettingsService", () => {
  let service: GuildSettingsService;
  let coreRepoMock: {
    getSettings: Mock;
    updateLocale: Mock;
    updateErrorChannel: Mock;
    resetGuildSettings: Mock;
  };
  let aggregateRepoMock: {
    deleteAllSettings: Mock;
  };

  // 各ケースで新しいモックとサービスインスタンスを生成する
  beforeEach(() => {
    vi.clearAllMocks();
    coreRepoMock = {
      getSettings: vi.fn(),
      updateLocale: vi.fn(),
      updateErrorChannel: vi.fn(),
      resetGuildSettings: vi.fn(),
    };
    aggregateRepoMock = {
      deleteAllSettings: vi.fn(),
    };
    service = new GuildSettingsService(
      coreRepoMock as any,
      aggregateRepoMock as any,
    );
  });

  // getSettings のテスト
  describe("getSettings", () => {
    it("リポジトリから取得した設定をそのまま返すこと", async () => {
      const config = {
        guildId: "g1",
        locale: "ja",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      coreRepoMock.getSettings.mockResolvedValue(config);
      const result = await service.getSettings("g1");
      expect(result).toBe(config);
      expect(coreRepoMock.getSettings).toHaveBeenCalledWith("g1");
    });

    it("設定が存在しない場合は null を返すこと", async () => {
      coreRepoMock.getSettings.mockResolvedValue(null);
      const result = await service.getSettings("g1");
      expect(result).toBeNull();
    });
  });

  // updateLocale のテスト
  describe("updateLocale", () => {
    it("リポジトリの updateLocale を呼び出すこと", async () => {
      await service.updateLocale("g1", "en");
      expect(coreRepoMock.updateLocale).toHaveBeenCalledWith("g1", "en");
    });

    it("リポジトリがエラーを投げた場合は DatabaseError になること", async () => {
      coreRepoMock.updateLocale.mockRejectedValue(new Error("db error"));
      await expect(service.updateLocale("g1", "en")).rejects.toThrow();
    });
  });

  // updateErrorChannel のテスト
  describe("updateErrorChannel", () => {
    it("リポジトリの updateErrorChannel を呼び出すこと", async () => {
      await service.updateErrorChannel("g1", "ch-1");
      expect(coreRepoMock.updateErrorChannel).toHaveBeenCalledWith(
        "g1",
        "ch-1",
      );
    });
  });

  // resetGuildSettings のテスト
  describe("resetGuildSettings", () => {
    it("リポジトリの resetGuildSettings を呼び出すこと", async () => {
      await service.resetGuildSettings("g1");
      expect(coreRepoMock.resetGuildSettings).toHaveBeenCalledWith("g1");
    });
  });

  // deleteAllSettings のテスト
  describe("deleteAllSettings", () => {
    it("リポジトリの deleteAllSettings を呼び出すこと", async () => {
      await service.deleteAllSettings("g1");
      expect(aggregateRepoMock.deleteAllSettings).toHaveBeenCalledWith("g1");
    });
  });
});
