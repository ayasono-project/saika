// ギルドのジョブ停止ユースケースのテスト

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    hasJob: vi.fn(),
    removeJob: vi.fn(),
  },
}));

import { stopGuildJobsUsecase } from "@/features/guild-settings/usecases/stopGuildJobsUsecase";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";

// タイマーだけを停止し DB に触れないことを検証する
describe("features/guild-settings/usecases/stopGuildJobsUsecase", () => {
  let findAllClosedByGuild: ReturnType<typeof vi.fn>;
  let cancelAllForGuild: ReturnType<typeof vi.fn>;

  function createDeps() {
    return {
      ticketRepository: { findAllClosedByGuild } as never,
      bumpReminderManager: { cancelAllForGuild } as never,
    };
  }

  // 各ケースで呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    findAllClosedByGuild = vi.fn().mockResolvedValue([]);
    cancelAllForGuild = vi.fn().mockResolvedValue(0);
  });

  it("チケット自動削除タイマーと Bump タイマーの両方を停止すること", async () => {
    findAllClosedByGuild.mockResolvedValue([{ id: "ticket-1" }]);
    vi.mocked(jobScheduler.hasJob).mockReturnValue(true);

    await stopGuildJobsUsecase(createDeps(), "guild-1");

    expect(jobScheduler.removeJob).toHaveBeenCalledWith(
      "ticket-auto-delete-ticket-1",
    );
    expect(cancelAllForGuild).toHaveBeenCalledWith("guild-1");
  });

  it("ジョブが未登録のチケットは removeJob を呼ばないこと", async () => {
    findAllClosedByGuild.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    vi.mocked(jobScheduler.hasJob)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await stopGuildJobsUsecase(createDeps(), "guild-1");

    expect(jobScheduler.removeJob).toHaveBeenCalledTimes(1);
    expect(jobScheduler.removeJob).toHaveBeenCalledWith("ticket-auto-delete-a");
  });

  it("findAllClosedByGuild が失敗しても Bump タイマーの停止は実行すること", async () => {
    findAllClosedByGuild.mockRejectedValue(new Error("fetch error"));

    await stopGuildJobsUsecase(createDeps(), "guild-1");

    expect(cancelAllForGuild).toHaveBeenCalledWith("guild-1");
  });

  it("クローズ済みチケットが無ければ removeJob を呼ばないこと", async () => {
    await stopGuildJobsUsecase(createDeps(), "guild-1");

    expect(jobScheduler.removeJob).not.toHaveBeenCalled();
    expect(cancelAllForGuild).toHaveBeenCalledWith("guild-1");
  });
});
