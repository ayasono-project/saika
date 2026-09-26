// GuildSettingsAggregateRepository の一括削除（deleteAllSettings）を検証

import { GuildSettingsAggregateRepository } from "@/features/guild-settings/guildSettingsAggregateRepository";

// prisma をスタブ化したシンプルな単体テスト
describe("shared/database/repositories/guildSettingsAggregateRepository", () => {
  // ── deleteAllSettings ──────────────────────────────────
  // 親行を消して作り直すことで、FK のカスケードに全機能テーブルの削除を任せる。
  // テーブルを個別に列挙する実装では追加のたびに漏れが起きていた（2026-09-20 に
  // 4テーブルの漏れを実際に踏んだ）ため、列挙そのものを無くしている。
  describe("deleteAllSettings", () => {
    /**
     * 親行のトランザクション操作を記録する prisma スタブを作る
     * @param existing findUnique が返す既存の親行（null で未登録を表す）
     * @returns スタブ本体と、各操作のモック
     */
    function createDeletePrisma(
      existing: { joinedAt: Date; scheduledDeletionAt: Date | null } | null,
    ) {
      const findUnique = vi.fn(async () => existing);
      const deleteFn = vi.fn();
      const create = vi.fn();
      const tx = { guild: { findUnique, delete: deleteFn, create } };
      const deletePrisma = {
        $transaction: vi.fn(
          async (fn: (t: typeof tx) => Promise<void>) => await fn(tx),
        ),
      };
      return { deletePrisma, findUnique, deleteFn, create };
    }

    it("親行を削除してカスケードで全機能テーブルを落とすこと", async () => {
      const { deletePrisma, deleteFn } = createDeletePrisma({
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        scheduledDeletionAt: null,
      });

      await new GuildSettingsAggregateRepository(
        deletePrisma as never,
      ).deleteAllSettings("g1");

      expect(deleteFn).toHaveBeenCalledWith({ where: { guildId: "g1" } });
    });

    it("Bot はまだ参加しているため、親行を同じ joinedAt で作り直すこと", async () => {
      const joinedAt = new Date("2026-01-01T00:00:00.000Z");
      const { deletePrisma, create } = createDeletePrisma({
        joinedAt,
        scheduledDeletionAt: null,
      });

      await new GuildSettingsAggregateRepository(
        deletePrisma as never,
      ).deleteAllSettings("g1");

      expect(create).toHaveBeenCalledWith({
        data: { guildId: "g1", joinedAt, scheduledDeletionAt: null },
      });
    });

    it("退出済みで削除予約が入っていれば、作り直した親行にも予約を引き継ぐこと", async () => {
      const joinedAt = new Date("2026-01-01T00:00:00.000Z");
      const scheduledDeletionAt = new Date("2026-02-01T00:00:00.000Z");
      const { deletePrisma, create } = createDeletePrisma({
        joinedAt,
        scheduledDeletionAt,
      });

      await new GuildSettingsAggregateRepository(
        deletePrisma as never,
      ).deleteAllSettings("g1");

      expect(create).toHaveBeenCalledWith({
        data: { guildId: "g1", joinedAt, scheduledDeletionAt },
      });
    });

    it("削除と再作成が同一トランザクション内で行われること（登録が失われないための保証）", async () => {
      const { deletePrisma, deleteFn, create } = createDeletePrisma({
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        scheduledDeletionAt: null,
      });

      await new GuildSettingsAggregateRepository(
        deletePrisma as never,
      ).deleteAllSettings("g1");

      expect(deletePrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(deleteFn.mock.invocationCallOrder[0]).toBeLessThan(
        create.mock.invocationCallOrder[0],
      );
    });

    it("親行が無い場合は何も削除しないこと（FK により子行も存在しえない）", async () => {
      const { deletePrisma, deleteFn, create } = createDeletePrisma(null);

      await new GuildSettingsAggregateRepository(
        deletePrisma as never,
      ).deleteAllSettings("g1");

      expect(deleteFn).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });
});
