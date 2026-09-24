// ギルド親レコード登録リポジトリのテスト

import type { PrismaClient } from "@prisma/client";
import { GuildRegistryRepository } from "@/features/guild-settings/guildRegistryRepository";

const upsertMock = vi.fn();
const createManyMock = vi.fn();

const prisma = {
  guild: {
    upsert: (...args: unknown[]) => upsertMock(...args),
    createMany: (...args: unknown[]) => createManyMock(...args),
  },
} as unknown as PrismaClient;

// 親行の upsert が既存行を書き換えないこと・一括登録の空配列ガードと重複スキップを検証する
describe("features/guild-settings/GuildRegistryRepository", () => {
  let repository: GuildRegistryRepository;

  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue(undefined);
    createManyMock.mockResolvedValue({ count: 0 });
    repository = new GuildRegistryRepository(prisma);
  });

  describe("ensureGuild", () => {
    it("親行を upsert し、既存行は update: {} で書き換えないこと", async () => {
      await repository.ensureGuild("guild-1");

      expect(upsertMock).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        create: { guildId: "guild-1" },
        update: {},
      });
    });
  });

  describe("ensureGuilds", () => {
    it("複数ギルドの親行を重複スキップ付きで一括作成すること", async () => {
      await repository.ensureGuilds(["guild-1", "guild-2"]);

      expect(createManyMock).toHaveBeenCalledWith({
        data: [{ guildId: "guild-1" }, { guildId: "guild-2" }],
        skipDuplicates: true,
      });
    });

    it("空配列の場合はクエリを投げないこと", async () => {
      await repository.ensureGuilds([]);

      expect(createManyMock).not.toHaveBeenCalled();
    });
  });
});
