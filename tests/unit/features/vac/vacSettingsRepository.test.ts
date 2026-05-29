// tests/unit/shared/database/repositories/vacSettingsRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildVacSettings: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/vacSettingsRepository", () => {
  async function loadModule() {
    return import("@/features/vac/vacSettingsRepository");
  }

  describe("getVacSettings", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVacSettings.findUnique.mockResolvedValue(null);

      const { VacSettingsRepository } = await loadModule();
      const repo = new VacSettingsRepository(prisma as never);
      const result = await repo.getVacSettings("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildVacSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("レコードが見つかった場合は jsonb 配列をそのまま VacSettings として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVacSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        triggerChannelIds: ["ch-1", "ch-2"],
        createdChannels: [
          { voiceChannelId: "v1", ownerId: "owner-1", createdAt: 0 },
        ],
      });

      const { VacSettingsRepository } = await loadModule();
      const repo = new VacSettingsRepository(prisma as never);
      const result = await repo.getVacSettings("guild-1");

      expect(result).toEqual({
        enabled: true,
        triggerChannelIds: ["ch-1", "ch-2"],
        createdChannels: [
          { voiceChannelId: "v1", ownerId: "owner-1", createdAt: 0 },
        ],
      });
    });
  });

  describe("updateVacSettings", () => {
    it("配列をそのまま jsonb として upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildVacSettings.upsert.mockResolvedValue({});

      const { VacSettingsRepository } = await loadModule();
      const repo = new VacSettingsRepository(prisma as never);
      await repo.updateVacSettings("guild-1", {
        enabled: true,
        triggerChannelIds: ["ch-1"],
        createdChannels: [
          { voiceChannelId: "v1", ownerId: "owner-1", createdAt: 0 },
        ],
      });

      expect(prisma.guildVacSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: true,
          triggerChannelIds: ["ch-1"],
          createdChannels: [
            { voiceChannelId: "v1", ownerId: "owner-1", createdAt: 0 },
          ],
        },
        update: {
          enabled: true,
          triggerChannelIds: ["ch-1"],
          createdChannels: [
            { voiceChannelId: "v1", ownerId: "owner-1", createdAt: 0 },
          ],
        },
      });
    });
  });
});
