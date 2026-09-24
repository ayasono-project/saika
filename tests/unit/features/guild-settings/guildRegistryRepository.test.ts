// ギルド親レコード登録リポジトリのテスト

import type { PrismaClient } from "@prisma/client";
import { GuildRegistryRepository } from "@/features/guild-settings/guildRegistryRepository";

const upsertMock = vi.fn();
const createManyMock = vi.fn();
const updateManyMock = vi.fn();
const findManyMock = vi.fn();
const deleteManyMock = vi.fn();

const prisma = {
  guild: {
    upsert: (...args: unknown[]) => upsertMock(...args),
    createMany: (...args: unknown[]) => createManyMock(...args),
    updateMany: (...args: unknown[]) => updateManyMock(...args),
    findMany: (...args: unknown[]) => findManyMock(...args),
    deleteMany: (...args: unknown[]) => deleteManyMock(...args),
  },
} as unknown as PrismaClient;

// 親行の登録・削除予約の書き込みと取り消し・猶予切れの列挙と削除を検証する
describe("features/guild-settings/GuildRegistryRepository", () => {
  let repository: GuildRegistryRepository;

  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue(undefined);
    createManyMock.mockResolvedValue({ count: 0 });
    updateManyMock.mockResolvedValue({ count: 0 });
    findManyMock.mockResolvedValue([]);
    deleteManyMock.mockResolvedValue({ count: 0 });
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

  describe("scheduleDeletion", () => {
    it("削除予定時刻を updateMany で書くこと（親行が無くても例外にしない）", async () => {
      const deleteAt = new Date("2026-10-24T00:00:00.000Z");

      await repository.scheduleDeletion("guild-1", deleteAt);

      expect(updateManyMock).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { scheduledDeletionAt: deleteAt },
      });
    });
  });

  describe("cancelScheduledDeletion", () => {
    it("削除予定時刻を null に戻すこと", async () => {
      await repository.cancelScheduledDeletion("guild-1");

      expect(updateManyMock).toHaveBeenCalledWith({
        where: { guildId: "guild-1" },
        data: { scheduledDeletionAt: null },
      });
    });
  });

  describe("cancelScheduledDeletions", () => {
    it("予約が入っている行だけを対象にし、取り消した件数を返すこと", async () => {
      updateManyMock.mockResolvedValueOnce({ count: 2 });

      const cancelled = await repository.cancelScheduledDeletions([
        "guild-1",
        "guild-2",
      ]);

      expect(updateManyMock).toHaveBeenCalledWith({
        where: {
          guildId: { in: ["guild-1", "guild-2"] },
          scheduledDeletionAt: { not: null },
        },
        data: { scheduledDeletionAt: null },
      });
      expect(cancelled).toBe(2);
    });

    it("空配列の場合はクエリを投げず 0 を返すこと", async () => {
      const cancelled = await repository.cancelScheduledDeletions([]);

      expect(updateManyMock).not.toHaveBeenCalled();
      expect(cancelled).toBe(0);
    });
  });

  describe("scheduleDeletionForAbsentGuilds", () => {
    it("参加中以外かつ予約の無い行だけに予約を書き、件数を返すこと（既存の予約は延ばさない）", async () => {
      const deleteAt = new Date("2026-10-25T00:00:00.000Z");
      updateManyMock.mockResolvedValueOnce({ count: 4 });

      const count = await repository.scheduleDeletionForAbsentGuilds(
        ["guild-1", "guild-2"],
        deleteAt,
      );

      expect(count).toBe(4);
      expect(updateManyMock).toHaveBeenCalledWith({
        where: {
          guildId: { notIn: ["guild-1", "guild-2"] },
          scheduledDeletionAt: null,
        },
        data: { scheduledDeletionAt: deleteAt },
      });
    });
  });

  describe("findGuildsDueForDeletion", () => {
    it("期限を過ぎたギルドの ID だけを返すこと", async () => {
      const now = new Date("2026-10-24T00:00:00.000Z");
      findManyMock.mockResolvedValueOnce([
        { guildId: "guild-1" },
        { guildId: "guild-2" },
      ]);

      const result = await repository.findGuildsDueForDeletion(now);

      expect(findManyMock).toHaveBeenCalledWith({
        where: { scheduledDeletionAt: { lte: now } },
        select: { guildId: true },
      });
      expect(result).toEqual(["guild-1", "guild-2"]);
    });
  });

  describe("deleteGuildsDueForDeletion", () => {
    it("削除時にも期限の条件を再評価すること（列挙後に再導入されたギルドを消さない）", async () => {
      const now = new Date("2026-10-24T00:00:00.000Z");
      deleteManyMock.mockResolvedValueOnce({ count: 1 });

      const deleted = await repository.deleteGuildsDueForDeletion(
        ["guild-1", "guild-2"],
        now,
      );

      expect(deleteManyMock).toHaveBeenCalledWith({
        where: {
          guildId: { in: ["guild-1", "guild-2"] },
          scheduledDeletionAt: { lte: now },
        },
      });
      expect(deleted).toBe(1);
    });

    it("空配列の場合はクエリを投げず 0 を返すこと", async () => {
      const deleted = await repository.deleteGuildsDueForDeletion(
        [],
        new Date(),
      );

      expect(deleteManyMock).not.toHaveBeenCalled();
      expect(deleted).toBe(0);
    });
  });
});
