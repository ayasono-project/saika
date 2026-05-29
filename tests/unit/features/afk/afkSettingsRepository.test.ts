// tests/unit/shared/database/repositories/afkSettingsRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildAfkSettings: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/afkSettingsRepository", () => {
  async function loadModule() {
    return import("@/features/afk/afkSettingsRepository");
  }

  describe("getAfkSettings", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.findUnique.mockResolvedValue(null);

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      const result = await repo.getAfkSettings("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildAfkSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("channelId を含むレコードが見つかった場合は AfkSettings を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        channelId: "ch-1",
      });

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      const result = await repo.getAfkSettings("guild-1");

      expect(result).toEqual({ enabled: true, channelId: "ch-1" });
    });

    it("DB の channelId が null の場合は undefined として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: false,
        channelId: null,
      });

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      const result = await repo.getAfkSettings("guild-1");

      expect(result).toEqual({ enabled: false, channelId: undefined });
    });
  });

  describe("setAfkChannel", () => {
    it("enabled=true と指定 channelId で updateAfkSettings が呼ばれること", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.upsert.mockResolvedValue({});

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      await repo.setAfkChannel("guild-1", "ch-99");

      expect(prisma.guildAfkSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guildId: "guild-1" },
          create: expect.objectContaining({
            enabled: true,
            channelId: "ch-99",
          }),
          update: expect.objectContaining({
            enabled: true,
            channelId: "ch-99",
          }),
        }),
      );
    });
  });

  describe("updateAfkSettings", () => {
    it("指定した設定値でレコードを upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.upsert.mockResolvedValue({});

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      await repo.updateAfkSettings("guild-1", {
        enabled: true,
        channelId: "ch-1",
      });

      expect(prisma.guildAfkSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: true,
          channelId: "ch-1",
        },
        update: {
          enabled: true,
          channelId: "ch-1",
        },
      });
    });

    it("channelId が undefined の場合は upsert で null を使用すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkSettings.upsert.mockResolvedValue({});

      const { AfkSettingsRepository } = await loadModule();
      const repo = new AfkSettingsRepository(prisma as never);
      await repo.updateAfkSettings("guild-1", { enabled: false });

      expect(prisma.guildAfkSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: false,
          channelId: null,
        },
        update: {
          enabled: false,
          channelId: null,
        },
      });
    });
  });
});
