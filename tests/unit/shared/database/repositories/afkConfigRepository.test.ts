// tests/unit/shared/database/repositories/afkConfigRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildAfkConfig: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/afkConfigRepository", () => {
  async function loadModule() {
    return import("@/shared/database/repositories/afkConfigRepository");
  }

  describe("getAfkConfig", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkConfig.findUnique.mockResolvedValue(null);

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      const result = await repo.getAfkConfig("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildAfkConfig.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("channelId を含むレコードが見つかった場合は AfkConfig を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        channelId: "ch-1",
      });

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      const result = await repo.getAfkConfig("guild-1");

      expect(result).toEqual({ enabled: true, channelId: "ch-1" });
    });

    it("DB の channelId が null の場合は undefined として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: false,
        channelId: null,
      });

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      const result = await repo.getAfkConfig("guild-1");

      expect(result).toEqual({ enabled: false, channelId: undefined });
    });
  });

  describe("setAfkChannel", () => {
    it("enabled=true と指定 channelId で updateAfkConfig が呼ばれること", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkConfig.upsert.mockResolvedValue({});

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      await repo.setAfkChannel("guild-1", "ch-99");

      expect(prisma.guildAfkConfig.upsert).toHaveBeenCalledWith(
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

  describe("updateAfkConfig", () => {
    it("指定した設定値でレコードを upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildAfkConfig.upsert.mockResolvedValue({});

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      await repo.updateAfkConfig("guild-1", {
        enabled: true,
        channelId: "ch-1",
      });

      expect(prisma.guildAfkConfig.upsert).toHaveBeenCalledWith({
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
      prisma.guildAfkConfig.upsert.mockResolvedValue({});

      const { AfkConfigRepository } = await loadModule();
      const repo = new AfkConfigRepository(prisma as never);
      await repo.updateAfkConfig("guild-1", { enabled: false });

      expect(prisma.guildAfkConfig.upsert).toHaveBeenCalledWith({
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
