// 退出時のデータ削除予約ユースケースのテスト

import {
  resolveGuildDeletionDeadline,
  scheduleGuildDeletionUsecase,
} from "@/features/guild-settings/usecases/scheduleGuildDeletionUsecase";

const scheduleDeletionMock = vi.fn();

// 猶予日数の加算と、予約の書き込み・戻り値を検証する
describe("features/guild-settings/scheduleGuildDeletionUsecase", () => {
  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    scheduleDeletionMock.mockResolvedValue(undefined);
  });

  describe("resolveGuildDeletionDeadline", () => {
    it("猶予日数（30日）を加えた時刻を返すこと", () => {
      const now = new Date("2026-09-24T12:34:56.000Z");

      expect(resolveGuildDeletionDeadline(now)).toEqual(
        new Date("2026-10-24T12:34:56.000Z"),
      );
    });

    it("月末を跨いでも暦どおりに加算されること", () => {
      const now = new Date("2026-01-31T00:00:00.000Z");

      expect(resolveGuildDeletionDeadline(now)).toEqual(
        new Date("2026-03-02T00:00:00.000Z"),
      );
    });
  });

  describe("scheduleGuildDeletionUsecase", () => {
    it("算出した削除予定時刻をリポジトリへ書き、その時刻を返すこと", async () => {
      const now = new Date("2026-09-24T00:00:00.000Z");
      const expected = new Date("2026-10-24T00:00:00.000Z");

      const result = await scheduleGuildDeletionUsecase(
        {
          guildRegistryRepository: {
            scheduleDeletion: scheduleDeletionMock,
          } as never,
        },
        "guild-1",
        now,
      );

      expect(scheduleDeletionMock).toHaveBeenCalledWith("guild-1", expected);
      expect(result).toEqual(expected);
    });
  });
});
