// tests/unit/shared/scheduler/jobScheduler.test.ts
import { JobScheduler } from "@/shared/scheduler/jobScheduler";
import { logger } from "@/shared/utils/logger";

const cronScheduleMock = vi.fn();

vi.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: (...args: unknown[]) => cronScheduleMock(...args),
  },
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: (key: string) => key,
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("shared/scheduler/jobScheduler", () => {
  // cron登録・one-time登録・削除/停止・統計取得の主要分岐を検証
  let scheduler: JobScheduler;

  // 各ケースでスケジューラーとモックを初期化し、タイマー副作用を排除
  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new JobScheduler();
    vi.clearAllMocks();
  });

  // 生成したタイマーを必ず解放して次ケースへ影響を残さない
  afterEach(() => {
    scheduler.stopAll();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // cronジョブを登録すると start され、管理対象に入ることを検証
  it("cron ジョブを登録すると start されて管理対象に追加されること", () => {
    const start = vi.fn();
    const stop = vi.fn();
    cronScheduleMock.mockReturnValueOnce({ start, stop });

    scheduler.addJob({
      id: "job-1",
      schedule: "*/5 * * * * *",
      task: vi.fn(),
    });

    expect(cronScheduleMock).toHaveBeenCalledWith(
      "*/5 * * * * *",
      expect.any(Function),
    );
    expect(start).toHaveBeenCalledTimes(1);
    expect(scheduler.hasJob("job-1")).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_scheduled"),
    );
  });

  // 同一IDの再登録時に既存ジョブを停止して置き換えることを検証
  it("同一 ID の cron ジョブを再登録すると既存ジョブを停止して置き換えること", () => {
    const first = { start: vi.fn(), stop: vi.fn() };
    const second = { start: vi.fn(), stop: vi.fn() };
    cronScheduleMock.mockReturnValueOnce(first).mockReturnValueOnce(second);

    scheduler.addJob({
      id: "job-dup",
      schedule: "*/5 * * * * *",
      task: vi.fn(),
    });
    scheduler.addJob({
      id: "job-dup",
      schedule: "*/10 * * * * *",
      task: vi.fn(),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_exists"),
    );
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(second.start).toHaveBeenCalledTimes(1);
    expect(scheduler.getJobCount()).toBe(1);
  });

  // cron登録処理が例外を投げた場合はログ出力して再送出することを検証
  it("cron スケジュール登録が失敗した場合にエラーをログ出力して再スローすること", () => {
    cronScheduleMock.mockImplementationOnce(() => {
      throw new Error("schedule failed");
    });

    expect(() =>
      scheduler.addJob({
        id: "job-error",
        schedule: "* * * * * *",
        task: vi.fn(),
      }),
    ).toThrow("schedule failed");

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.schedule_failed"),
      expect.any(Error),
    );
  });

  // cronコールバック内の正常完了と例外ログを検証
  it("cron コールバックを実行してタスクエラーを安全にログ記録すること", async () => {
    cronScheduleMock.mockReturnValueOnce({
      start: vi.fn(),
      stop: vi.fn(),
    });

    const okTask = vi.fn().mockResolvedValue(undefined);
    scheduler.addJob({
      id: "job-callback",
      schedule: "* * * * * *",
      task: okTask,
    });

    const callback = cronScheduleMock.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(okTask).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.executing_job"),
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_completed"),
    );

    const failTask = vi.fn().mockRejectedValue(new Error("task failed"));
    cronScheduleMock.mockReturnValueOnce({
      start: vi.fn(),
      stop: vi.fn(),
    });

    scheduler.addJob({
      id: "job-callback-fail",
      schedule: "* * * * * *",
      task: failTask,
    });

    const failCallback = cronScheduleMock.mock
      .calls[1][1] as () => Promise<void>;
    await failCallback();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_error"),
      expect.any(Error),
    );
  });

  // one-timeジョブは0未満遅延を0に補正し、実行後に自動削除されることを検証
  it("ワンタイムジョブが遅延を 0 にクランプして実行後に自動削除されること", async () => {
    const task = vi.fn().mockResolvedValue(undefined);

    scheduler.addOneTimeJob("once-1", -100, task);
    expect(scheduler.hasJob("once-1")).toBe(true);

    vi.runOnlyPendingTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(1);
    expect(scheduler.hasJob("once-1")).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.executing_job"),
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_completed"),
    );
  });

  // one-timeタスク例外時は落とさずログ出力することを検証
  it("ワンタイムジョブのタスクエラーをログに記録すること", async () => {
    const task = vi.fn().mockRejectedValue(new Error("once failed"));

    scheduler.addOneTimeJob("once-error", 0, task);

    vi.runOnlyPendingTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_error"),
      expect.any(Error),
    );
  });

  // one-time を同一IDで再登録したとき、既存を削除して新規のみ実行することを検証
  it("同一 ID のワンタイムジョブを再登録すると既存を削除して新規のみ実行すること", async () => {
    const oldTask = vi.fn().mockResolvedValue(undefined);
    const newTask = vi.fn().mockResolvedValue(undefined);

    scheduler.addOneTimeJob("once-dup", 1_000, oldTask);
    scheduler.addOneTimeJob("once-dup", 1_000, newTask);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_exists"),
    );
    expect(scheduler.getJobIds()).toEqual(["once-dup"]);

    vi.runOnlyPendingTimers();
    await Promise.resolve();

    expect(oldTask).not.toHaveBeenCalled();
    expect(newTask).toHaveBeenCalledTimes(1);
  });

  // removeJob は cron/one-time の両方を削除でき、未登録は false を返すことを検証
  it("cron とワンタイムジョブを削除でき、未登録の場合は false を返すこと", () => {
    const cronTask = { start: vi.fn(), stop: vi.fn() };
    cronScheduleMock.mockReturnValueOnce(cronTask);

    scheduler.addJob({
      id: "remove-cron",
      schedule: "* * * * * *",
      task: vi.fn(),
    });

    scheduler.addOneTimeJob("remove-once", 1_000, vi.fn());

    expect(scheduler.removeJob("remove-cron")).toBe(true);
    expect(cronTask.stop).toHaveBeenCalledTimes(1);

    expect(scheduler.removeJob("remove-once")).toBe(true);
    expect(scheduler.removeJob("missing")).toBe(false);
  });

  // stopAll で全ジョブ停止・クリアされ、統計が0になることを検証
  it("stopAll で全ジョブを停止・クリアして統計が 0 になること", () => {
    const cronA = { start: vi.fn(), stop: vi.fn() };
    const cronB = { start: vi.fn(), stop: vi.fn() };
    cronScheduleMock.mockReturnValueOnce(cronA).mockReturnValueOnce(cronB);

    scheduler.addJob({
      id: "cron-a",
      schedule: "* * * * * *",
      task: vi.fn(),
    });
    scheduler.addJob({
      id: "cron-b",
      schedule: "*/2 * * * * *",
      task: vi.fn(),
    });
    scheduler.addOneTimeJob("once-a", 1_000, vi.fn());

    expect(scheduler.getJobCount()).toBe(3);
    expect(scheduler.getJobIds().sort()).toEqual([
      "cron-a",
      "cron-b",
      "once-a",
    ]);

    scheduler.stopAll();

    expect(cronA.stop).toHaveBeenCalledTimes(1);
    expect(cronB.stop).toHaveBeenCalledTimes(1);
    expect(scheduler.getJobCount()).toBe(0);
    expect(scheduler.getJobIds()).toEqual([]);
    expect(scheduler.hasJob("cron-a")).toBe(false);
    expect(scheduler.hasJob("once-a")).toBe(false);
  });
});
