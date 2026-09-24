// 猶予切れギルドの削除ユースケースのテスト

import { purgeExpiredGuildsUsecase } from "@/features/guild-settings/usecases/purgeExpiredGuildsUsecase";

const findGuildsDueForDeletionMock = vi.fn();
const deleteGuildsDueForDeletionMock = vi.fn();
const findAllClosedByGuildMock = vi.fn();
const cancelAllForGuildMock = vi.fn();
const hasJobMock = vi.fn();
const removeJobMock = vi.fn();

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    hasJob: (...args: unknown[]) => hasJobMock(...args),
    removeJob: (...args: unknown[]) => removeJobMock(...args),
  },
}));

/**
 * ユースケースへ渡す依存オブジェクトを組み立てる
 * @returns モック済みの依存オブジェクト
 */
function createDeps() {
  return {
    guildRegistryRepository: {
      findGuildsDueForDeletion: findGuildsDueForDeletionMock,
      deleteGuildsDueForDeletion: deleteGuildsDueForDeletionMock,
    } as never,
    ticketRepository: {
      findAllClosedByGuild: findAllClosedByGuildMock,
    } as never,
    bumpReminderManager: {
      cancelAllForGuild: cancelAllForGuildMock,
    } as never,
  };
}

// 対象なしの早期リターン・タイマー解除と削除の順序・削除件数の返却を検証する
describe("features/guild-settings/purgeExpiredGuildsUsecase", () => {
  // 各ケースでモック呼び出し記録と既定の解決値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    findGuildsDueForDeletionMock.mockResolvedValue([]);
    deleteGuildsDueForDeletionMock.mockResolvedValue(0);
    findAllClosedByGuildMock.mockResolvedValue([]);
    cancelAllForGuildMock.mockResolvedValue(0);
    hasJobMock.mockReturnValue(false);
  });

  it("対象が無い場合は削除を呼ばず 0 を返すこと", async () => {
    const result = await purgeExpiredGuildsUsecase(createDeps(), new Date());

    expect(deleteGuildsDueForDeletionMock).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("対象ギルドごとにインメモリタイマーを解除すること", async () => {
    findGuildsDueForDeletionMock.mockResolvedValueOnce(["g1", "g2"]);

    await purgeExpiredGuildsUsecase(createDeps(), new Date());

    expect(cancelAllForGuildMock).toHaveBeenCalledWith("g1");
    expect(cancelAllForGuildMock).toHaveBeenCalledWith("g2");
  });

  it("タイマー解除を DB 削除より先に行うこと（生き残ったタイマーの空振りを防ぐ順序）", async () => {
    findGuildsDueForDeletionMock.mockResolvedValueOnce(["g1"]);

    await purgeExpiredGuildsUsecase(createDeps(), new Date());

    expect(cancelAllForGuildMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteGuildsDueForDeletionMock.mock.invocationCallOrder[0],
    );
  });

  it("列挙した ID と現在時刻を渡して削除し、削除件数を返すこと", async () => {
    const now = new Date("2026-10-24T00:00:00.000Z");
    findGuildsDueForDeletionMock.mockResolvedValueOnce(["g1", "g2"]);
    deleteGuildsDueForDeletionMock.mockResolvedValueOnce(2);

    const result = await purgeExpiredGuildsUsecase(createDeps(), now);

    expect(deleteGuildsDueForDeletionMock).toHaveBeenCalledWith(
      ["g1", "g2"],
      now,
    );
    expect(result).toBe(2);
  });
});
