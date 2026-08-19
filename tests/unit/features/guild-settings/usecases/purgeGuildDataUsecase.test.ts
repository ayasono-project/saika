// tests/unit/features/guild-settings/usecases/purgeGuildDataUsecase.test.ts
// ギルド全データ後始末ユースケースのテスト

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    hasJob: vi.fn(),
    removeJob: vi.fn(),
  },
}));

import { purgeGuildDataUsecase } from "@/features/guild-settings/usecases/purgeGuildDataUsecase";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";

describe("features/guild-settings/usecases/purgeGuildDataUsecase", () => {
  let deleteAllSettings: ReturnType<typeof vi.fn>;
  let findAllClosedByGuild: ReturnType<typeof vi.fn>;
  let cancelAllForGuild: ReturnType<typeof vi.fn>;

  function createDeps() {
    return {
      guildSettingsService: { deleteAllSettings } as never,
      ticketRepository: { findAllClosedByGuild } as never,
      bumpReminderManager: { cancelAllForGuild } as never,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    deleteAllSettings = vi.fn().mockResolvedValue(undefined);
    findAllClosedByGuild = vi.fn().mockResolvedValue([]);
    cancelAllForGuild = vi.fn().mockResolvedValue(0);
  });

  it("チケット自動削除タイマー・Bump タイマー・DB 削除をすべて実行すること", async () => {
    findAllClosedByGuild.mockResolvedValue([{ id: "ticket-1" }]);
    vi.mocked(jobScheduler.hasJob).mockReturnValue(true);

    await purgeGuildDataUsecase(createDeps(), "guild-1");

    expect(jobScheduler.removeJob).toHaveBeenCalledWith(
      "ticket-auto-delete-ticket-1",
    );
    expect(cancelAllForGuild).toHaveBeenCalledWith("guild-1");
    expect(deleteAllSettings).toHaveBeenCalledWith("guild-1");
  });

  // DB 行を先に消すとインメモリタイマーが生き残って投稿が実行され、
  // 続く updateStatus が P2025 で失敗してログが荒れる
  it("タイマー解除を DB 削除より先に実行すること", async () => {
    const order: string[] = [];
    findAllClosedByGuild.mockResolvedValue([{ id: "ticket-1" }]);
    vi.mocked(jobScheduler.hasJob).mockReturnValue(true);
    vi.mocked(jobScheduler.removeJob).mockImplementation(() => {
      order.push("ticket");
      return true;
    });
    cancelAllForGuild.mockImplementation(async () => {
      order.push("bump");
      return 0;
    });
    deleteAllSettings.mockImplementation(async () => {
      order.push("delete");
    });

    await purgeGuildDataUsecase(createDeps(), "guild-1");

    expect(order).toEqual(["ticket", "bump", "delete"]);
  });

  it("ジョブが未登録のチケットは removeJob を呼ばないこと", async () => {
    findAllClosedByGuild.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    vi.mocked(jobScheduler.hasJob)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await purgeGuildDataUsecase(createDeps(), "guild-1");

    expect(jobScheduler.removeJob).toHaveBeenCalledTimes(1);
    expect(jobScheduler.removeJob).toHaveBeenCalledWith("ticket-auto-delete-a");
  });

  it("findAllClosedByGuild が失敗しても後続処理を継続すること", async () => {
    findAllClosedByGuild.mockRejectedValue(new Error("fetch error"));

    await purgeGuildDataUsecase(createDeps(), "guild-1");

    expect(cancelAllForGuild).toHaveBeenCalledWith("guild-1");
    expect(deleteAllSettings).toHaveBeenCalledWith("guild-1");
  });
});
