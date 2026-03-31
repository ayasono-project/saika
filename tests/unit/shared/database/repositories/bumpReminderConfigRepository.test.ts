// tests/unit/shared/database/repositories/bumpReminderConfigRepository.test.ts

import type { Mock } from "vitest";
import {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
} from "@/shared/database/types";

function createPrismaMock() {
  return {
    guildBumpReminderConfig: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
      update: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/bumpReminderConfigRepository", () => {
  async function loadModule() {
    return import(
      "@/shared/database/repositories/bumpReminderConfigRepository"
    );
  }

  describe("getBumpReminderConfig", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.getBumpReminderConfig("guild-1");

      expect(result).toBeNull();
    });

    it("レコードが見つかった場合は全フィールドを含む設定を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        channelId: "ch-1",
        mentionRoleId: "role-1",
        mentionUserIds: '["user-1","user-2"]',
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.getBumpReminderConfig("guild-1");

      expect(result).toEqual({
        enabled: true,
        channelId: "ch-1",
        mentionRoleId: "role-1",
        mentionUserIds: ["user-1", "user-2"],
      });
    });

    it("null の任意フィールドは undefined として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: false,
        channelId: null,
        mentionRoleId: null,
        mentionUserIds: "[]",
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.getBumpReminderConfig("guild-1");

      expect(result).toEqual({
        enabled: false,
        channelId: undefined,
        mentionRoleId: undefined,
        mentionUserIds: [],
      });
    });

    it("mentionUserIds が無効な JSON の場合は空配列を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        channelId: null,
        mentionRoleId: null,
        mentionUserIds: "invalid-json",
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.getBumpReminderConfig("guild-1");

      expect(result?.mentionUserIds).toEqual([]);
    });
  });

  describe("setBumpReminderEnabled", () => {
    it("channelId が指定された場合に enabled=true で upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.upsert.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      await repo.setBumpReminderEnabled("guild-1", true, "ch-1");

      expect(prisma.guildBumpReminderConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guildId: "guild-1" },
          create: expect.objectContaining({
            guildId: "guild-1",
            enabled: true,
            channelId: "ch-1",
          }),
          update: expect.objectContaining({
            enabled: true,
            channelId: "ch-1",
          }),
        }),
      );
    });

    it("channelId が未指定の場合は update に channelId を含めないこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.upsert.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      await repo.setBumpReminderEnabled("guild-1", false);

      const call = prisma.guildBumpReminderConfig.upsert.mock.calls[0][0];
      expect(call.update).not.toHaveProperty("channelId");
    });
  });

  describe("updateBumpReminderConfig", () => {
    it("mentionUserIds を JSON 文字列化して upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.upsert.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      await repo.updateBumpReminderConfig("guild-1", {
        enabled: true,
        channelId: "ch-1",
        mentionRoleId: "role-1",
        mentionUserIds: ["user-1"],
      });

      expect(prisma.guildBumpReminderConfig.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
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

  describe("setBumpReminderMentionRole", () => {
    it("レコードが存在しない場合は NOT_CONFIGURED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.setBumpReminderMentionRole("guild-1", "role-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED);
    });

    it("レコードが見つかった場合は mentionRoleId を更新して UPDATED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.setBumpReminderMentionRole("guild-1", "role-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_ROLE_RESULT.UPDATED);
      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionRoleId: "role-1" },
      });
    });

    it("undefined が渡された場合は mentionRoleId を null に設定すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      await repo.setBumpReminderMentionRole("guild-1", undefined);

      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionRoleId: null },
      });
    });
  });

  describe("addBumpReminderMentionUser", () => {
    it("レコードが存在しない場合は NOT_CONFIGURED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.addBumpReminderMentionUser("guild-1", "user-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_USER_ADD_RESULT.NOT_CONFIGURED);
    });

    it("ユーザーがすでにリストにいる場合は ALREADY_EXISTS を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: '["user-1"]',
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.addBumpReminderMentionUser("guild-1", "user-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_USER_ADD_RESULT.ALREADY_EXISTS);
    });

    it("ユーザーを追加して ADDED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: "[]",
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.addBumpReminderMentionUser("guild-1", "user-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_USER_ADD_RESULT.ADDED);
      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionUserIds: '["user-1"]' },
      });
    });
  });

  describe("removeBumpReminderMentionUser", () => {
    it("レコードが存在しない場合は NOT_CONFIGURED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.removeBumpReminderMentionUser(
        "guild-1",
        "user-1",
      );

      expect(result).toBe(
        BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.NOT_CONFIGURED,
      );
    });

    it("ユーザーがリストにいない場合は NOT_FOUND を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: '["user-2"]',
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.removeBumpReminderMentionUser(
        "guild-1",
        "user-1",
      );

      expect(result).toBe(BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.NOT_FOUND);
    });

    it("ユーザーを削除して REMOVED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: '["user-1","user-2"]',
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.removeBumpReminderMentionUser(
        "guild-1",
        "user-1",
      );

      expect(result).toBe(BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.REMOVED);
      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionUserIds: '["user-2"]' },
      });
    });
  });

  describe("clearBumpReminderMentionUsers", () => {
    it("レコードが存在しない場合は NOT_CONFIGURED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentionUsers("guild-1");

      expect(result).toBe(
        BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.NOT_CONFIGURED,
      );
    });

    it("リストが空の場合は ALREADY_EMPTY を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: "[]",
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentionUsers("guild-1");

      expect(result).toBe(
        BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.ALREADY_EMPTY,
      );
    });

    it("リストをクリアして CLEARED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionUserIds: '["user-1"]',
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentionUsers("guild-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.CLEARED);
      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionUserIds: "[]" },
      });
    });
  });

  describe("clearBumpReminderMentions", () => {
    it("レコードが存在しない場合は NOT_CONFIGURED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue(null);

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentions("guild-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_CLEAR_RESULT.NOT_CONFIGURED);
    });

    it("ロールもユーザーもない場合は ALREADY_CLEARED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionRoleId: null,
        mentionUserIds: "[]",
      });

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentions("guild-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_CLEAR_RESULT.ALREADY_CLEARED);
    });

    it("ロールが設定されている場合はメンションをクリアして CLEARED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionRoleId: "role-1",
        mentionUserIds: "[]",
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentions("guild-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_CLEAR_RESULT.CLEARED);
      expect(prisma.guildBumpReminderConfig.update).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { mentionRoleId: null, mentionUserIds: "[]" },
      });
    });

    it("ユーザーが設定されている場合はメンションをクリアして CLEARED を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildBumpReminderConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        mentionRoleId: null,
        mentionUserIds: '["user-1"]',
      });
      prisma.guildBumpReminderConfig.update.mockResolvedValue({});

      const { BumpReminderConfigRepository } = await loadModule();
      const repo = new BumpReminderConfigRepository(prisma as never);
      const result = await repo.clearBumpReminderMentions("guild-1");

      expect(result).toBe(BUMP_REMINDER_MENTION_CLEAR_RESULT.CLEARED);
    });
  });
});
