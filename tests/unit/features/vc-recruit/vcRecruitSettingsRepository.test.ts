// tests/unit/shared/database/repositories/vcRecruitSettingsRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildVcRecruitSettings: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/vcRecruitSettingsRepository", () => {
  async function loadModule() {
    return import("@/features/vc-recruit/vcRecruitSettingsRepository");
  }

  describe("getVcRecruitSettings", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitSettings.findUnique.mockResolvedValue(null);

      const { VcRecruitSettingsRepository } = await loadModule();
      const repo = new VcRecruitSettingsRepository(prisma as never);
      const result = await repo.getVcRecruitSettings("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildVcRecruitSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("レコードが見つかった場合は jsonb 配列をそのまま VcRecruitSettings として返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitSettings.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        mentionRoleIds: ["role-1", "role-2"],
        setups: [
          { id: "setup-1", categoryId: "cat-1", createdVoiceChannelIds: [] },
        ],
      });

      const { VcRecruitSettingsRepository } = await loadModule();
      const repo = new VcRecruitSettingsRepository(prisma as never);
      const result = await repo.getVcRecruitSettings("guild-1");

      expect(result).toEqual({
        enabled: true,
        mentionRoleIds: ["role-1", "role-2"],
        setups: [
          { id: "setup-1", categoryId: "cat-1", createdVoiceChannelIds: [] },
        ],
      });
    });
  });

  describe("updateVcRecruitSettings", () => {
    it("配列をそのまま jsonb として upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitSettings.upsert.mockResolvedValue({});

      const { VcRecruitSettingsRepository } = await loadModule();
      const repo = new VcRecruitSettingsRepository(prisma as never);
      await repo.updateVcRecruitSettings("guild-1", {
        enabled: true,
        mentionRoleIds: ["role-1"],
        setups: [],
      });

      expect(prisma.guildVcRecruitSettings.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: true,
          mentionRoleIds: ["role-1"],
          setups: [],
        },
        update: {
          enabled: true,
          mentionRoleIds: ["role-1"],
          setups: [],
        },
      });
    });
  });
});
