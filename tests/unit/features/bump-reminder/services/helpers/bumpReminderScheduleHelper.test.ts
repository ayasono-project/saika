const addOneTimeJobMock = vi.fn();
const removeJobMock = vi.fn();

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    addOneTimeJob: (...args: unknown[]) => addOneTimeJobMock(...args),
    removeJob: (...args: unknown[]) => removeJobMock(...args),
  },
}));

import {
  cancelScheduledReminder,
  scheduleReminderInMemory,
} from "@/features/bump-reminder/services/helpers/bumpReminderScheduleHelper";

// 予約の登録・実行後の後始末・取り消しで、管理マップとスケジューラーが揃うことを検証
describe("bot/features/bump-reminder/services/helpers/bumpReminderScheduleHelper", () => {
  // ケースごとに呼び出し記録と差し替えた実装を戻し、前のケースの副作用を持ち込まない
  beforeEach(() => {
    vi.clearAllMocks();
    addOneTimeJobMock.mockReset();
  });

  it("ワンタイムジョブをスケジュールしてリマインダーをマップで追跡する", async () => {
    const reminders = new Map<string, { jobId: string; reminderId: string }>();
    const task = vi.fn().mockResolvedValue(undefined);

    let scheduledTask: (() => Promise<void>) | undefined;
    addOneTimeJobMock.mockImplementationOnce(
      (_jobId: string, _delayMs: number, callback: () => Promise<void>) => {
        scheduledTask = callback;
      },
    );

    scheduleReminderInMemory(reminders, "g1", "job-1", "rem-1", 5000, task);
    expect(reminders.get("g1")).toEqual({
      jobId: "job-1",
      reminderId: "rem-1",
    });

    await scheduledTask?.();
    expect(task).toHaveBeenCalledTimes(1);
    expect(reminders.has("g1")).toBe(false);
  });

  // 前の予約のタスクが実行中に同じキーへ次の予約が入っても、次の予約のエントリが消えないことを検証（回帰テスト）
  it("タスク実行中に同じキーへ次の予約が入った場合、終了時に次の予約のエントリを消さない", async () => {
    const reminders = new Map<string, { jobId: string; reminderId: string }>();
    const scheduledTasks: Array<() => Promise<void>> = [];
    addOneTimeJobMock.mockImplementation(
      (_jobId: string, _delayMs: number, callback: () => Promise<void>) => {
        scheduledTasks.push(callback);
      },
    );

    // 1件目のタスクは、実行中に2件目の予約が入る状況を作る
    const firstTask = vi.fn(async () => {
      scheduleReminderInMemory(
        reminders,
        "g1:Disboard",
        "job-1",
        "rem-2",
        5000,
        vi.fn().mockResolvedValue(undefined),
      );
    });
    scheduleReminderInMemory(
      reminders,
      "g1:Disboard",
      "job-1",
      "rem-1",
      5000,
      firstTask,
    );

    await scheduledTasks[0]?.();

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(reminders.get("g1:Disboard")).toEqual({
      jobId: "job-1",
      reminderId: "rem-2",
    });
  });

  it("タスクが失敗しても、自分のエントリは管理マップから外す", async () => {
    const reminders = new Map<string, { jobId: string; reminderId: string }>();
    let scheduledTask: (() => Promise<void>) | undefined;
    addOneTimeJobMock.mockImplementationOnce(
      (_jobId: string, _delayMs: number, callback: () => Promise<void>) => {
        scheduledTask = callback;
      },
    );

    scheduleReminderInMemory(
      reminders,
      "g1",
      "job-1",
      "rem-1",
      5000,
      vi.fn().mockRejectedValue(new Error("task failed")),
    );

    await expect(scheduledTask?.()).rejects.toThrow("task failed");
    expect(reminders.has("g1")).toBe(false);
  });

  it("追跡中のリマインダーをキャンセルしてスケジューラーのジョブを削除する", () => {
    const reminders = new Map<string, { jobId: string; reminderId: string }>();
    reminders.set("g1", { jobId: "job-1", reminderId: "rem-1" });

    const removed = cancelScheduledReminder(reminders, "g1");

    expect(removed).toEqual({ jobId: "job-1", reminderId: "rem-1" });
    expect(removeJobMock).toHaveBeenCalledWith("job-1");
    expect(reminders.has("g1")).toBe(false);
  });
});
