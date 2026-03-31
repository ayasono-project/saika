// tests/unit/shared/database/repositories/vcRecruitConfigRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildVcRecruitConfig: {
      findUnique: vi.fn() as Mock,
      upsert: vi.fn() as Mock,
    },
  };
}

describe("shared/database/repositories/vcRecruitConfigRepository", () => {
  async function loadModule() {
    return import("@/shared/database/repositories/vcRecruitConfigRepository");
  }

  describe("getVcRecruitConfig", () => {
    it("レコードが存在しない場合は null を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitConfig.findUnique.mockResolvedValue(null);

      const { VcRecruitConfigRepository } = await loadModule();
      const repo = new VcRecruitConfigRepository(prisma as never);
      const result = await repo.getVcRecruitConfig("guild-1");

      expect(result).toBeNull();
      expect(prisma.guildVcRecruitConfig.findUnique).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
      });
    });

    it("レコードが見つかった場合は配列をパースした VcRecruitConfig を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        mentionRoleIds: '["role-1","role-2"]',
        setups:
          '[{"id":"setup-1","categoryId":"cat-1","createdVoiceChannelIds":[]}]',
      });

      const { VcRecruitConfigRepository } = await loadModule();
      const repo = new VcRecruitConfigRepository(prisma as never);
      const result = await repo.getVcRecruitConfig("guild-1");

      expect(result).toEqual({
        enabled: true,
        mentionRoleIds: ["role-1", "role-2"],
        setups: [
          { id: "setup-1", categoryId: "cat-1", createdVoiceChannelIds: [] },
        ],
      });
    });

    it("無効な JSON の場合は空配列を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: false,
        mentionRoleIds: "invalid",
        setups: "invalid",
      });

      const { VcRecruitConfigRepository } = await loadModule();
      const repo = new VcRecruitConfigRepository(prisma as never);
      const result = await repo.getVcRecruitConfig("guild-1");

      expect(result).toEqual({
        enabled: false,
        mentionRoleIds: [],
        setups: [],
      });
    });

    it("配列でない JSON 値の場合は空配列を返すこと", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitConfig.findUnique.mockResolvedValue({
        guildId: "guild-1",
        enabled: true,
        mentionRoleIds: '{"not":"array"}',
        setups: '"a string"',
      });

      const { VcRecruitConfigRepository } = await loadModule();
      const repo = new VcRecruitConfigRepository(prisma as never);
      const result = await repo.getVcRecruitConfig("guild-1");

      expect(result).toEqual({
        enabled: true,
        mentionRoleIds: [],
        setups: [],
      });
    });
  });

  describe("updateVcRecruitConfig", () => {
    it("配列を JSON 文字列化してレコードを upsert すること", async () => {
      const prisma = createPrismaMock();
      prisma.guildVcRecruitConfig.upsert.mockResolvedValue({});

      const { VcRecruitConfigRepository } = await loadModule();
      const repo = new VcRecruitConfigRepository(prisma as never);
      await repo.updateVcRecruitConfig("guild-1", {
        enabled: true,
        mentionRoleIds: ["role-1"],
        setups: [],
      });

      expect(prisma.guildVcRecruitConfig.upsert).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: {
          guildId: "guild-1",
          enabled: true,
          mentionRoleIds: '["role-1"]',
          setups: "[]",
        },
        update: {
          enabled: true,
          mentionRoleIds: '["role-1"]',
          setups: "[]",
        },
      });
    });
  });
});
