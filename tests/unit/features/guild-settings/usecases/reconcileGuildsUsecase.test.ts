// ギルド登録の照合ユースケースのテスト

import { reconcileGuildsUsecase } from "@/features/guild-settings/usecases/reconcileGuildsUsecase";

const ensureGuildsMock = vi.fn();
const cancelScheduledDeletionsMock = vi.fn();
const scheduleDeletionForAbsentGuildsMock = vi.fn();
const purgeExpiredGuildsUsecaseMock = vi.fn();

vi.mock("@/features/guild-settings/usecases/purgeExpiredGuildsUsecase", () => ({
  purgeExpiredGuildsUsecase: (...args: unknown[]) =>
    purgeExpiredGuildsUsecaseMock(...args),
}));

/**
 * ユースケースへ渡す依存オブジェクトを組み立てる
 * @returns モック済みの依存オブジェクト
 */
function createDeps() {
  return {
    guildRegistryRepository: {
      ensureGuilds: ensureGuildsMock,
      cancelScheduledDeletions: cancelScheduledDeletionsMock,
      scheduleDeletionForAbsentGuilds: scheduleDeletionForAbsentGuildsMock,
    } as never,
    ticketRepository: {} as never,
    bumpReminderManager: {} as never,
  };
}

// 照合4段の呼び出し順序・予約の起点・空キャッシュ時のガード・件数の集計を検証する
describe("features/guild-settings/reconcileGuildsUsecase", () => {
  const now = new Date("2026-09-25T00:00:00.000Z");

  // 各ケースでモック呼び出し記録と既定の解決値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    ensureGuildsMock.mockResolvedValue(undefined);
    cancelScheduledDeletionsMock.mockResolvedValue(0);
    scheduleDeletionForAbsentGuildsMock.mockResolvedValue(0);
    purgeExpiredGuildsUsecaseMock.mockResolvedValue(0);
  });

  it("補完 → 取り消し → 予約 → 削除の順に実行すること（取り消しを削除より先に行う）", async () => {
    await reconcileGuildsUsecase(createDeps(), ["g1"], now);

    const order = [
      ensureGuildsMock,
      cancelScheduledDeletionsMock,
      scheduleDeletionForAbsentGuildsMock,
      purgeExpiredGuildsUsecaseMock,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("参加中のギルドを補完・取り消し・予約除外の対象として渡すこと", async () => {
    await reconcileGuildsUsecase(createDeps(), ["g1", "g2"], now);

    expect(ensureGuildsMock).toHaveBeenCalledWith(["g1", "g2"]);
    expect(cancelScheduledDeletionsMock).toHaveBeenCalledWith(["g1", "g2"]);
    expect(scheduleDeletionForAbsentGuildsMock).toHaveBeenCalledWith(
      ["g1", "g2"],
      expect.any(Date),
    );
  });

  it("新たな予約は現在時刻から猶予30日後にすること", async () => {
    await reconcileGuildsUsecase(createDeps(), ["g1"], now);

    expect(scheduleDeletionForAbsentGuildsMock).toHaveBeenCalledWith(
      ["g1"],
      new Date("2026-10-25T00:00:00.000Z"),
    );
  });

  it("参加ギルドが0件なら予約を入れないこと（設定ミスで全ギルドを予約しない）", async () => {
    const result = await reconcileGuildsUsecase(createDeps(), [], now);

    expect(scheduleDeletionForAbsentGuildsMock).not.toHaveBeenCalled();
    expect(result.scheduledCount).toBe(0);
    // 期限切れの削除は参加状況に依存しないので続行する
    expect(purgeExpiredGuildsUsecaseMock).toHaveBeenCalledWith(
      expect.anything(),
      now,
    );
  });

  it("各段の件数をまとめて返すこと", async () => {
    cancelScheduledDeletionsMock.mockResolvedValueOnce(1);
    scheduleDeletionForAbsentGuildsMock.mockResolvedValueOnce(4);
    purgeExpiredGuildsUsecaseMock.mockResolvedValueOnce(2);

    const result = await reconcileGuildsUsecase(createDeps(), ["g1"], now);

    expect(result).toEqual({
      cancelledCount: 1,
      scheduledCount: 4,
      purgedCount: 2,
    });
  });
});
