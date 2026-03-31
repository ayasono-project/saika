// tests/unit/shared/features/guild-config/guildConfigService.test.ts
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

import { EXPORT_SCHEMA_VERSION } from "@/shared/features/guild-config/guildConfigDefaults";
import { GuildConfigService } from "@/shared/features/guild-config/guildConfigService";

// GuildConfigService のビジネスロジックを検証
describe("shared/features/guild-config/guildConfigService", () => {
  let service: GuildConfigService;
  let coreRepoMock: {
    getConfig: Mock;
    updateLocale: Mock;
    updateErrorChannel: Mock;
    resetGuildSettings: Mock;
  };
  let aggregateRepoMock: {
    deleteAllConfigs: Mock;
    getFullConfig: Mock;
    importFullConfig: Mock;
  };

  // 各ケースで新しいモックとサービスインスタンスを生成する
  beforeEach(() => {
    vi.clearAllMocks();
    coreRepoMock = {
      getConfig: vi.fn(),
      updateLocale: vi.fn(),
      updateErrorChannel: vi.fn(),
      resetGuildSettings: vi.fn(),
    };
    aggregateRepoMock = {
      deleteAllConfigs: vi.fn(),
      getFullConfig: vi.fn(),
      importFullConfig: vi.fn(),
    };
    service = new GuildConfigService(
      coreRepoMock as any,
      aggregateRepoMock as any,
    );
  });

  // getConfig のテスト
  describe("getConfig", () => {
    it("リポジトリから取得した設定をそのまま返すこと", async () => {
      const config = {
        guildId: "g1",
        locale: "ja",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      coreRepoMock.getConfig.mockResolvedValue(config);
      const result = await service.getConfig("g1");
      expect(result).toBe(config);
      expect(coreRepoMock.getConfig).toHaveBeenCalledWith("g1");
    });

    it("設定が存在しない場合は null を返すこと", async () => {
      coreRepoMock.getConfig.mockResolvedValue(null);
      const result = await service.getConfig("g1");
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

  // deleteAllConfig のテスト
  describe("deleteAllConfig", () => {
    it("リポジトリの deleteAllConfigs を呼び出すこと", async () => {
      await service.deleteAllConfig("g1");
      expect(aggregateRepoMock.deleteAllConfigs).toHaveBeenCalledWith("g1");
    });
  });

  // exportConfig のテスト
  describe("exportConfig", () => {
    it("設定が存在する場合はエクスポートデータを返すこと", async () => {
      aggregateRepoMock.getFullConfig.mockResolvedValue({ locale: "ja" });
      const result = await service.exportConfig("g1");
      expect(result).toEqual({
        version: EXPORT_SCHEMA_VERSION,
        exportedAt: expect.any(String),
        guildId: "g1",
        config: { locale: "ja" },
      });
    });

    it("設定が存在しない場合は null を返すこと", async () => {
      aggregateRepoMock.getFullConfig.mockResolvedValue(null);
      const result = await service.exportConfig("g1");
      expect(result).toBeNull();
    });
  });

  // validateImportData のテスト
  describe("validateImportData", () => {
    it("正常なデータの場合は null を返すこと", () => {
      const data = { version: 1, guildId: "g1", config: {} };
      expect(service.validateImportData(data, "g1")).toBeNull();
    });

    it("null の場合はエラーキーを返すこと", () => {
      expect(service.validateImportData(null, "g1")).toBe(
        "guildConfig:user-response.import_invalid_json",
      );
    });

    it("version が異なる場合はエラーキーを返すこと", () => {
      const data = { version: 999, guildId: "g1", config: {} };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildConfig:user-response.import_unsupported_version",
      );
    });

    it("guildId が不一致の場合はエラーキーを返すこと", () => {
      const data = { version: 1, guildId: "other", config: {} };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildConfig:user-response.import_guild_mismatch",
      );
    });

    it("config がない場合はエラーキーを返すこと", () => {
      const data = { version: 1, guildId: "g1" };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildConfig:user-response.import_invalid_json",
      );
    });
  });

  // importConfig のテスト
  describe("importConfig", () => {
    it("リポジトリの importFullConfig を呼び出すこと", async () => {
      const data = {
        version: 1,
        exportedAt: "",
        guildId: "g1",
        config: { locale: "ja" },
      };
      await service.importConfig("g1", data);
      expect(aggregateRepoMock.importFullConfig).toHaveBeenCalledWith("g1", {
        locale: "ja",
      });
    });
  });
});
