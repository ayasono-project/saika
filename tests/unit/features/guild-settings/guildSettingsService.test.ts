// tests/unit/shared/features/guild-settings/guildSettingsService.test.ts
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

import { EXPORT_SCHEMA_VERSION } from "@/features/guild-settings/guildSettingsDefaults";
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
    getFullSettings: Mock;
    importFullSettings: Mock;
    planImportMerge: Mock;
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
      getFullSettings: vi.fn(),
      importFullSettings: vi.fn(),
      planImportMerge: vi.fn(),
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

  // exportSettings のテスト
  describe("exportSettings", () => {
    it("設定が存在する場合は state を含むエクスポートデータを返すこと", async () => {
      aggregateRepoMock.getFullSettings.mockResolvedValue({
        locale: "ja",
        state: {
          ticketSettings: [],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      });
      const result = await service.exportSettings("g1");
      expect(result).toEqual({
        version: EXPORT_SCHEMA_VERSION,
        exportedAt: expect.any(String),
        guildId: "g1",
        settings: { locale: "ja" },
        state: {
          ticketSettings: [],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      });
    });

    it("state が無い場合は空構造でフォールバックすること", async () => {
      aggregateRepoMock.getFullSettings.mockResolvedValue({ locale: "ja" });
      const result = await service.exportSettings("g1");
      expect(result?.state).toEqual({
        ticketSettings: [],
        openTickets: [],
        stickyMessages: [],
        reactionRolePanels: [],
        vacCreatedChannels: [],
      });
    });

    it("設定が存在しない場合は null を返すこと", async () => {
      aggregateRepoMock.getFullSettings.mockResolvedValue(null);
      const result = await service.exportSettings("g1");
      expect(result).toBeNull();
    });
  });

  // validateImportData のテスト
  describe("validateImportData", () => {
    it("正常なデータの場合は null を返すこと", () => {
      const data = { version: 1, guildId: "g1", settings: {} };
      expect(service.validateImportData(data, "g1")).toBeNull();
    });

    it("null の場合はエラーキーを返すこと", () => {
      expect(service.validateImportData(null, "g1")).toBe(
        "guildSettings:user-response.import_invalid_json",
      );
    });

    it("version が異なる場合はエラーキーを返すこと", () => {
      const data = { version: 999, guildId: "g1", settings: {} };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildSettings:user-response.import_unsupported_version",
      );
    });

    it("guildId が不一致の場合はエラーキーを返すこと", () => {
      const data = { version: 1, guildId: "other", settings: {} };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildSettings:user-response.import_guild_mismatch",
      );
    });

    it("config がない場合はエラーキーを返すこと", () => {
      const data = { version: 1, guildId: "g1" };
      expect(service.validateImportData(data, "g1")).toBe(
        "guildSettings:user-response.import_invalid_json",
      );
    });
  });

  // importSettings のテスト
  describe("importSettings", () => {
    it("リポジトリの importFullSettings を呼び出すこと（state 不在時は空構造でフォールバック）", async () => {
      const data = {
        version: 1,
        exportedAt: "",
        guildId: "g1",
        settings: { locale: "ja" },
      };
      await service.importSettings("g1", data);
      expect(aggregateRepoMock.importFullSettings).toHaveBeenCalledWith("g1", {
        locale: "ja",
        state: {
          ticketSettings: [],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      });
    });

    it("state がある場合はそのまま渡すこと", async () => {
      const data = {
        version: 1,
        exportedAt: "",
        guildId: "g1",
        settings: { locale: "ja" },
        state: {
          ticketSettings: [],
          openTickets: [],
          stickyMessages: [
            {
              channelId: "ch-1",
              content: "x",
              embedData: null,
              updatedBy: null,
              lastMessageId: null,
            },
          ],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      };
      await service.importSettings("g1", data);
      expect(aggregateRepoMock.importFullSettings).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({
          state: expect.objectContaining({
            stickyMessages: data.state.stickyMessages,
          }),
        }),
      );
    });
  });

  // planImport のテスト
  describe("planImport", () => {
    it("リポジトリの planImportMerge にデータを渡して計画を返すこと", async () => {
      const plan = {
        ticketSettingsToInsert: 2,
        openTicketsToInsert: 0,
        stickyMessagesToInsert: 1,
        reactionRolePanelsToInsert: 0,
        vacCreatedChannelsToInsert: 0,
      };
      aggregateRepoMock.planImportMerge.mockResolvedValue(plan);
      const result = await service.planImport("g1", {
        version: 1,
        exportedAt: "",
        guildId: "g1",
        settings: { locale: "ja" },
      });
      expect(result).toBe(plan);
      expect(aggregateRepoMock.planImportMerge).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ locale: "ja", state: expect.any(Object) }),
      );
    });
  });
});
