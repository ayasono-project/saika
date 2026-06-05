// tests/unit/features/unverified-kick/unverifiedKickWarnRepository.test.ts

import type { Mock } from "vitest";

function createPrismaMock() {
  return {
    guildUnverifiedKickWarn: {
      findMany: vi.fn() as Mock,
      createMany: vi.fn() as Mock,
      deleteMany: vi.fn() as Mock,
    },
  };
}

describe("unverified-kick/unverifiedKickWarnRepository", () => {
  async function loadModule() {
    return import("@/features/unverified-kick/unverifiedKickWarnRepository");
  }

  describe("getWarnedMap", () => {
    it("レコードを userId → warnedAt のマップへ変換する", async () => {
      const prisma = createPrismaMock();
      const at = new Date(2026, 0, 5);
      prisma.guildUnverifiedKickWarn.findMany.mockResolvedValue([
        { userId: "u1", warnedAt: at },
        { userId: "u2", warnedAt: at },
      ]);

      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      const map = await repo.getWarnedMap("g1");

      expect(prisma.guildUnverifiedKickWarn.findMany).toHaveBeenCalledWith({
        where: { guildId: "g1" },
        select: { userId: true, warnedAt: true },
      });
      expect(map.get("u1")).toEqual(at);
      expect(map.get("u2")).toEqual(at);
      expect(map.size).toBe(2);
    });
  });

  describe("recordWarned", () => {
    it("空配列なら createMany を呼ばない", async () => {
      const prisma = createPrismaMock();
      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      await repo.recordWarned("g1", [], new Date());
      expect(prisma.guildUnverifiedKickWarn.createMany).not.toHaveBeenCalled();
    });

    it("skipDuplicates 付きで各ユーザーを挿入する（冪等）", async () => {
      const prisma = createPrismaMock();
      prisma.guildUnverifiedKickWarn.createMany.mockResolvedValue({});
      const at = new Date(2026, 0, 5);
      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      await repo.recordWarned("g1", ["u1", "u2"], at);

      expect(prisma.guildUnverifiedKickWarn.createMany).toHaveBeenCalledWith({
        data: [
          { guildId: "g1", userId: "u1", warnedAt: at },
          { guildId: "g1", userId: "u2", warnedAt: at },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("deleteWarned", () => {
    it("空配列なら deleteMany を呼ばない", async () => {
      const prisma = createPrismaMock();
      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      await repo.deleteWarned("g1", []);
      expect(prisma.guildUnverifiedKickWarn.deleteMany).not.toHaveBeenCalled();
    });

    it("指定ユーザーの記録を削除する", async () => {
      const prisma = createPrismaMock();
      prisma.guildUnverifiedKickWarn.deleteMany.mockResolvedValue({});
      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      await repo.deleteWarned("g1", ["u1", "u2"]);

      expect(prisma.guildUnverifiedKickWarn.deleteMany).toHaveBeenCalledWith({
        where: { guildId: "g1", userId: { in: ["u1", "u2"] } },
      });
    });
  });

  describe("deleteAllByGuild", () => {
    it("ギルドの全記録を削除する", async () => {
      const prisma = createPrismaMock();
      prisma.guildUnverifiedKickWarn.deleteMany.mockResolvedValue({});
      const { UnverifiedKickWarnRepository } = await loadModule();
      const repo = new UnverifiedKickWarnRepository(prisma as never);
      await repo.deleteAllByGuild("g1");

      expect(prisma.guildUnverifiedKickWarn.deleteMany).toHaveBeenCalledWith({
        where: { guildId: "g1" },
      });
    });
  });
});
