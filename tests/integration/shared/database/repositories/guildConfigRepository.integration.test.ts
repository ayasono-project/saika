// tests/integration/shared/database/repositories/guildConfigRepository.integration.test.ts
/**
 * スタンドアロンリポジトリ統合テスト
 * GuildCoreRepository + 各機能リポジトリの Prisma 委譲を検証
 */

import { AfkConfigRepository } from "@/shared/database/repositories/afkConfigRepository";
import { BumpReminderConfigRepository } from "@/shared/database/repositories/bumpReminderConfigRepository";
import { GuildCoreRepository } from "@/shared/database/repositories/guildCoreRepository";
import type { GuildConfig } from "@/shared/database/types";
import { DatabaseError } from "@/shared/errors/customErrors";

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
  tDefault: (key: string) => `mocked:${key}`,
  tInteraction: (...args: unknown[]) => args[1],
}));

// Prismaクライアントのモック
const mockPrismaClient = {
  guildConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  guildAfkConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  guildBumpReminderConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  guildVacConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  guildMemberLogConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  guildVcRecruitConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

describe("GuildCoreRepository", () => {
  let repository: GuildCoreRepository;
  const baseTime = new Date("2026-02-20T00:00:00.000Z");

  const atOffsetMs = (offsetMs: number): Date =>
    new Date(baseTime.getTime() + offsetMs);

  beforeEach(() => {
    // @ts-expect-error - モックのため型エラーは無視
    repository = new GuildCoreRepository(mockPrismaClient);
    vi.clearAllMocks();
  });

  describe("getConfig()", () => {
    it("guildId でギルド設定を取得できること", async () => {
      const mockRecord = {
        guildId: "123456789",
        locale: "ja",
        afkConfig: JSON.stringify({ enabled: true, channelId: "111" }),
        vacConfig: null,
        bumpReminderConfig: null,
        stickMessages: null,
        memberLogConfig: null,
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.guildConfig.findUnique.mockResolvedValue(mockRecord);

      const config = await repository.getConfig("123456789");

      expect(config).toBeDefined();
      expect(config?.guildId).toBe("123456789");
      expect(config?.locale).toBe("ja");
    });

    it("設定が存在しない場合は null を返すこと", async () => {
      mockPrismaClient.guildConfig.findUnique.mockResolvedValue(null);

      const config = await repository.getConfig("nonexistent");

      expect(config).toBeNull();
    });

    it("getConfig 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.guildConfig.findUnique.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await expect(repository.getConfig("123456789")).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("saveConfig()", () => {
    it("新規ギルド設定を作成できること", async () => {
      const newConfig: GuildConfig = {
        guildId: "123456789",
        locale: "ja",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.guildConfig.create.mockResolvedValue({
        guildId: newConfig.guildId,
        locale: newConfig.locale,
        createdAt: newConfig.createdAt,
        updatedAt: newConfig.updatedAt,
      });

      await repository.saveConfig(newConfig);

      expect(mockPrismaClient.guildConfig.create).toHaveBeenCalled();
    });

    it("saveConfig 失敗時に DatabaseError をスローすること", async () => {
      const newConfig: GuildConfig = {
        guildId: "123456789",
        locale: "ja",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.guildConfig.create.mockRejectedValue(
        new Error("Unique constraint failed"),
      );

      await expect(repository.saveConfig(newConfig)).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("updateConfig()", () => {
    it("既存の設定を更新できること", async () => {
      mockPrismaClient.guildConfig.upsert.mockResolvedValue({
        guildId: "123456789",
        locale: "en",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      });

      await repository.updateConfig("123456789", { locale: "en" });

      expect(mockPrismaClient.guildConfig.upsert).toHaveBeenCalled();
    });
  });

  describe("deleteConfig()", () => {
    it("ギルド設定を削除できること", async () => {
      mockPrismaClient.guildConfig.delete.mockResolvedValue({
        guildId: "123456789",
        locale: "ja",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      });

      await repository.deleteConfig("123456789");

      expect(mockPrismaClient.guildConfig.delete).toHaveBeenCalled();
    });
  });

  describe("exists()", () => {
    it("設定が存在する場合は true を返すこと", async () => {
      mockPrismaClient.guildConfig.findUnique.mockResolvedValue({
        id: "some-id",
      });

      const exists = await repository.exists("123456789");

      expect(exists).toBe(true);
    });

    it("設定が存在しない場合は false を返すこと", async () => {
      mockPrismaClient.guildConfig.findUnique.mockResolvedValue(null);

      const exists = await repository.exists("nonexistent");

      expect(exists).toBe(false);
    });
  });

  describe("getLocale()", () => {
    it("ギルドのロケールを取得できること", async () => {
      mockPrismaClient.guildConfig.findUnique.mockResolvedValue({
        guildId: "123456789",
        locale: "en",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      });

      const locale = await repository.getLocale("123456789");

      expect(locale).toBe("en");
    });

    it("未設定ギルドは既定ロケールを返すこと", async () => {
      mockPrismaClient.guildConfig.findUnique.mockResolvedValue(null);

      const locale = await repository.getLocale("nonexistent");

      expect(locale).toBe("ja");
    });
  });
});

describe("AfkConfigRepository", () => {
  let repository: AfkConfigRepository;

  beforeEach(() => {
    // @ts-expect-error - モックのため型エラーは無視
    repository = new AfkConfigRepository(mockPrismaClient);
    vi.clearAllMocks();
  });

  describe("setAfkChannel()", () => {
    it("新しいチャンネルで AFK 設定を upsert できること", async () => {
      mockPrismaClient.guildAfkConfig.upsert.mockResolvedValue({});

      await repository.setAfkChannel("123456789", "vc-1");

      expect(mockPrismaClient.guildAfkConfig.upsert).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        create: { guildId: "123456789", enabled: true, channelId: "vc-1" },
        update: { enabled: true, channelId: "vc-1" },
      });
    });
  });

  describe("updateAfkConfig()", () => {
    it("AFK 設定を upsert できること", async () => {
      mockPrismaClient.guildAfkConfig.upsert.mockResolvedValue({});

      await repository.updateAfkConfig("123456789", {
        enabled: false,
        channelId: "ch-x",
      });

      expect(mockPrismaClient.guildAfkConfig.upsert).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        create: {
          guildId: "123456789",
          enabled: false,
          channelId: "ch-x",
        },
        update: {
          enabled: false,
          channelId: "ch-x",
        },
      });
    });
  });
});

describe("BumpReminderConfigRepository", () => {
  let repository: BumpReminderConfigRepository;

  beforeEach(() => {
    // @ts-expect-error - モックのため型エラーは無視
    repository = new BumpReminderConfigRepository(mockPrismaClient);
    vi.clearAllMocks();
  });

  describe("getBumpReminderConfig()", () => {
    it("未設定の場合は null を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const config = await repository.getBumpReminderConfig("123456789");

      expect(config).toBeNull();
    });

    it("設定済みの場合はバンプリマインダー設定を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        enabled: false,
        channelId: "999999999",
        mentionRoleId: "888888888",
        mentionUserIds: '["111111111","222222222"]',
      });

      const config = await repository.getBumpReminderConfig("123456789");

      expect(config).toEqual({
        enabled: false,
        channelId: "999999999",
        mentionRoleId: "888888888",
        mentionUserIds: ["111111111", "222222222"],
      });
    });
  });

  describe("setBumpReminderEnabled()", () => {
    it("enabled フラグ付きでバンプ設定を upsert できること", async () => {
      mockPrismaClient.guildBumpReminderConfig.upsert.mockResolvedValue({});

      await repository.setBumpReminderEnabled("123456789", true, "ch-1");

      expect(
        mockPrismaClient.guildBumpReminderConfig.upsert,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        create: {
          guildId: "123456789",
          enabled: true,
          channelId: "ch-1",
          mentionUserIds: "[]",
        },
        update: {
          enabled: true,
          channelId: "ch-1",
        },
      });
    });

    it("channelId 未指定でバンプ設定を upsert できること", async () => {
      mockPrismaClient.guildBumpReminderConfig.upsert.mockResolvedValue({});

      await repository.setBumpReminderEnabled("123456789", false);

      expect(
        mockPrismaClient.guildBumpReminderConfig.upsert,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        create: {
          guildId: "123456789",
          enabled: false,
          channelId: null,
          mentionUserIds: "[]",
        },
        update: { enabled: false },
      });
    });
  });

  describe("updateBumpReminderConfig()", () => {
    it("バンプリマインダー設定を全フィールドで upsert できること", async () => {
      const nextConfig = {
        enabled: true,
        channelId: "ch-1",
        mentionRoleId: "role-1",
        mentionUserIds: ["user-1"],
      };

      mockPrismaClient.guildBumpReminderConfig.upsert.mockResolvedValue({});

      await repository.updateBumpReminderConfig("123456789", nextConfig);

      expect(
        mockPrismaClient.guildBumpReminderConfig.upsert,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        create: {
          guildId: "123456789",
          enabled: true,
          channelId: "ch-1",
          mentionRoleId: "role-1",
          mentionUserIds: '["user-1"]',
        },
        update: {
          enabled: true,
          channelId: "ch-1",
          mentionRoleId: "role-1",
          mentionUserIds: '["user-1"]',
        },
      });
    });
  });

  describe("addBumpReminderMentionUser()", () => {
    it("レコードが存在しない場合は not-configured を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const result = await repository.addBumpReminderMentionUser(
        "123456789",
        "user-a",
      );

      expect(result).toBe("not-configured");
    });

    it("メンションリストに未登録のユーザーを追加できること", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: '["user-a"]',
      });
      mockPrismaClient.guildBumpReminderConfig.update.mockResolvedValue({});

      const result = await repository.addBumpReminderMentionUser(
        "123456789",
        "user-b",
      );

      expect(result).toBe("added");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        data: { mentionUserIds: '["user-a","user-b"]' },
      });
    });

    it("ユーザーが既にリストに存在する場合は already-exists を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: '["user-a"]',
      });

      const result = await repository.addBumpReminderMentionUser(
        "123456789",
        "user-a",
      );

      expect(result).toBe("already-exists");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe("setBumpReminderMentionRole()", () => {
    it("レコードが存在しない場合は not-configured を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const result = await repository.setBumpReminderMentionRole(
        "123456789",
        "new-role",
      );

      expect(result).toBe("not-configured");
    });

    it("メンションロールを設定できること", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionRoleId: "old-role",
        mentionUserIds: '["user-a"]',
      });
      mockPrismaClient.guildBumpReminderConfig.update.mockResolvedValue({});

      const result = await repository.setBumpReminderMentionRole(
        "123456789",
        "new-role",
      );

      expect(result).toBe("updated");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        data: { mentionRoleId: "new-role" },
      });
    });
  });

  describe("removeBumpReminderMentionUser()", () => {
    it("レコードが存在しない場合は not-configured を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const result = await repository.removeBumpReminderMentionUser(
        "123456789",
        "user-b",
      );

      expect(result).toBe("not-configured");
    });

    it("メンションリストのユーザーを削除できること", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: '["user-a","user-b"]',
      });
      mockPrismaClient.guildBumpReminderConfig.update.mockResolvedValue({});

      const result = await repository.removeBumpReminderMentionUser(
        "123456789",
        "user-b",
      );

      expect(result).toBe("removed");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        data: { mentionUserIds: '["user-a"]' },
      });
    });

    it("ユーザーがリストに存在しない場合は not-found を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: '["user-a"]',
      });

      const result = await repository.removeBumpReminderMentionUser(
        "123456789",
        "user-z",
      );

      expect(result).toBe("not-found");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe("clearBumpReminderMentionUsers()", () => {
    it("レコードが存在しない場合は not-configured を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const result =
        await repository.clearBumpReminderMentionUsers("123456789");

      expect(result).toBe("not-configured");
    });

    it("全メンションユーザーをクリアできること", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: '["user-a","user-b"]',
      });
      mockPrismaClient.guildBumpReminderConfig.update.mockResolvedValue({});

      const result =
        await repository.clearBumpReminderMentionUsers("123456789");

      expect(result).toBe("cleared");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        data: { mentionUserIds: "[]" },
      });
    });

    it("リストがすでに空の場合は already-empty を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionUserIds: "[]",
      });

      const result =
        await repository.clearBumpReminderMentionUsers("123456789");

      expect(result).toBe("already-empty");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe("clearBumpReminderMentions()", () => {
    it("レコードが存在しない場合は not-configured を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue(
        null,
      );

      const result = await repository.clearBumpReminderMentions("123456789");

      expect(result).toBe("not-configured");
    });

    it("ロールとメンションユーザーをクリアできること", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionRoleId: "role-a",
        mentionUserIds: '["user-a","user-b"]',
      });
      mockPrismaClient.guildBumpReminderConfig.update.mockResolvedValue({});

      const result = await repository.clearBumpReminderMentions("123456789");

      expect(result).toBe("cleared");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).toHaveBeenCalledWith({
        where: { guildId: "123456789" },
        data: { mentionRoleId: null, mentionUserIds: "[]" },
      });
    });

    it("クリア対象がない場合は already-cleared を返すこと", async () => {
      mockPrismaClient.guildBumpReminderConfig.findUnique.mockResolvedValue({
        mentionRoleId: null,
        mentionUserIds: "[]",
      });

      const result = await repository.clearBumpReminderMentions("123456789");

      expect(result).toBe("already-cleared");
      expect(
        mockPrismaClient.guildBumpReminderConfig.update,
      ).not.toHaveBeenCalled();
    });
  });
});
