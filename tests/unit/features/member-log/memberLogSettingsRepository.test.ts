// tests/unit/shared/database/repositories/memberLogSettingsRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildMemberLogSettings: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/memberLogSettingsRepository", () => {
  async function loadModule() {
    return import("@/features/member-log/memberLogSettingsRepository");
  }

  describe("getMemberLogSettings", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildMemberLogSettings.findUnique.mockResolvedValue(null);

      const { MemberLogSettingsRepository } = await loadModule();
      const repo = new MemberLogSettingsRepository(prisma as never);
      const result = await repo.getMemberLogSettings("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildMemberLogSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("レコードが見つかった場合は全フィールドを含む MemberLogSettings を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildMemberLogSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        channelId: "ch-1",
        joinMessage: "Welcome {user}!",
        leaveMessage: "Goodbye {user}!",
      });

      const { MemberLogSettingsRepository } = await loadModule();
      const repo = new MemberLogSettingsRepository(prisma as never);
      const result = await repo.getMemberLogSettings("guild-1");

      expect(result).toEqual({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "Welcome {user}!",
        leaveMessage: "Goodbye {user}!",
      });
    });

    it("null の任意フィールドは undefined として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildMemberLogSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: false,
        channelId: null,
        joinMessage: null,
        leaveMessage: null,
      });

      const { MemberLogSettingsRepository } = await loadModule();
      const repo = new MemberLogSettingsRepository(prisma as never);
      const result = await repo.getMemberLogSettings("guild-1");

      expect(result).toEqual({
        enabled: false,
        channelId: undefined,
        joinMessage: undefined,
        leaveMessage: undefined,
      });
    });
  });

  describe("updateMemberLogSettings", () => {
    it("指定した全フィールドでレコードを upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildMemberLogSettings.upsert.mockResolvedValue({});

      const { MemberLogSettingsRepository } = await loadModule();
      const repo = new MemberLogSettingsRepository(prisma as never);
      await repo.updateMemberLogSettings("guild-1", {
        enabled: true,
        channelId: "ch-1",
        joinMessage: "Welcome!",
        leaveMessage: "Goodbye!",
      });

      expect(prisma.guildMemberLogSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: true,
          channelId: "ch-1",
          joinMessage: "Welcome!",
          leaveMessage: "Goodbye!",
        },
        update: {
          enabled: true,
          channelId: "ch-1",
          joinMessage: "Welcome!",
          leaveMessage: "Goodbye!",
        },
      });
    });

    it("未指定の任意フィールドには null を使用すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildMemberLogSettings.upsert.mockResolvedValue({});

      const { MemberLogSettingsRepository } = await loadModule();
      const repo = new MemberLogSettingsRepository(prisma as never);
      await repo.updateMemberLogSettings("guild-1", { enabled: false });

      expect(prisma.guildMemberLogSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: false,
          channelId: null,
          joinMessage: null,
          leaveMessage: null,
        },
        update: {
          enabled: false,
          channelId: null,
          joinMessage: null,
          leaveMessage: null,
        },
      });
    });
  });
});
