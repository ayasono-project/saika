import { JobScheduler } from "@/shared/scheduler/jobScheduler";
import { MAX_TIMEOUT_DELAY_MS } from "@/shared/scheduler/jobScheduler.constants";
import { logger } from "@/shared/utils/logger";

/** 1日のミリ秒 */
const DAY_MS = 24 * 60 * 60 * 1000;

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
    // fake の setTimeout に掛けたスパイは、実タイマーへ戻す前に外す（戻した後に fake を書き戻さないため）
    vi.restoreAllMocks();
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

  // timezone 指定時に cron.schedule へ TaskOptions が渡ることを検証
  it("timezone 指定時に cron.schedule へ timezone オプションを渡すこと", () => {
    cronScheduleMock.mockReturnValueOnce({ start: vi.fn(), stop: vi.fn() });

    scheduler.addJob({
      id: "job-tz",
      schedule: "0 4 * * *",
      task: vi.fn(),
      timezone: "Asia/Tokyo",
    });

    expect(cronScheduleMock).toHaveBeenCalledWith(
      "0 4 * * *",
      expect.any(Function),
      { timezone: "Asia/Tokyo" },
    );
  });

  // noOverlap / timezone 併用時に両オプションが cron.schedule へ渡ることを検証
  it("noOverlap 指定時に cron.schedule へ noOverlap オプションを渡すこと", () => {
    cronScheduleMock.mockReturnValueOnce({ start: vi.fn(), stop: vi.fn() });

    scheduler.addJob({
      id: "job-nooverlap",
      schedule: "0 4 * * *",
      task: vi.fn(),
      timezone: "Asia/Tokyo",
      noOverlap: true,
    });

    expect(cronScheduleMock).toHaveBeenCalledWith(
      "0 4 * * *",
      expect.any(Function),
      { timezone: "Asia/Tokyo", noOverlap: true },
    );
  });

  // cron 登録時に同一 ID の one-time ジョブも置き換える（両マップを確認するガード）ことを検証
  it("cron ジョブ登録時に同一 ID の one-time ジョブを停止して置き換えること", () => {
    const oneTimeTask = vi.fn();
    scheduler.addOneTimeJob("dup-id", 1_000, oneTimeTask);
    expect(scheduler.hasJob("dup-id")).toBe(true);

    cronScheduleMock.mockReturnValueOnce({ start: vi.fn(), stop: vi.fn() });
    scheduler.addJob({
      id: "dup-id",
      schedule: "* * * * * *",
      task: vi.fn(),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_exists"),
    );
    // one-time が消えて cron ジョブのみが残る（両マップに同 ID が並存しない）
    expect(scheduler.getJobCount()).toBe(1);

    vi.runOnlyPendingTimers();
    expect(oneTimeTask).not.toHaveBeenCalled();
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

  // 定期的に張り直す再試行（チケットの自動削除の保留）で、予約のたびに info が並ばないことを検証
  it("scheduledLogLevel に debug を渡すと、予約完了のログを info ではなく debug で出す", () => {
    scheduler.addOneTimeJob("retry-job", 1000, vi.fn(), {
      scheduledLogLevel: "debug",
    });

    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_scheduled"),
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("system:scheduler.job_scheduled"),
    );
    scheduler.removeJob("retry-job");
  });

  // setTimeout の上限（2^31-1 ms・約24.8日）を超える遅延を、区切って張り直して正しく待つことを検証する。
  // fake timers も Node と同じく上限超えを 1ms に切り詰めるため、上限をそのまま渡すと即時に発火して落ちる
  describe("addOneTimeJob（setTimeout の上限を超える遅延）", () => {
    // 30日のジョブ（チケットの自動削除 30日相当）が期限前に発火せず、期限ちょうどに1回だけ発火すること
    it("30日のジョブ → 期限の1ms前までは発火せず、期限ちょうどに1回だけ発火する", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("long-30d", 30 * DAY_MS, task);

      await vi.advanceTimersByTimeAsync(30 * DAY_MS - 1);
      expect(task).not.toHaveBeenCalled();
      expect(scheduler.hasJob("long-30d")).toBe(true);

      await vi.advanceTimersByTimeAsync(1);
      expect(task).toHaveBeenCalledTimes(1);
      expect(scheduler.hasJob("long-30d")).toBe(false);

      // 期限後にさらに時間が進んでも再発火しない
      await vi.advanceTimersByTimeAsync(90 * DAY_MS);
      expect(task).toHaveBeenCalledTimes(1);
    });

    // 90日のジョブ（ダッシュボードの上限）は区間を何度も張り直すが、setTimeout には常に上限以下しか渡さないこと
    it("90日のジョブ → setTimeout に上限を超える値を渡さず、期限ちょうどに1回だけ発火する", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const task = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("long-90d", 90 * DAY_MS, task);

      await vi.advanceTimersByTimeAsync(90 * DAY_MS - 1);
      expect(task).not.toHaveBeenCalled();
      // 張り直し中も同じ ID が1件だけ管理される
      expect(scheduler.getJobIds()).toEqual(["long-90d"]);

      await vi.advanceTimersByTimeAsync(1);
      expect(task).toHaveBeenCalledTimes(1);
      expect(scheduler.getJobCount()).toBe(0);

      const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
      // 90日 ÷ 上限 → 4区間に分けて待つ
      expect(delays).toHaveLength(4);
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(MAX_TIMEOUT_DELAY_MS);
      }
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("system:scheduler.job_rearmed"),
      );
    });

    // 上限ちょうどは1区間、上限+1ms は2区間になり、どちらも指定時刻より早く発火しないこと
    it("上限ちょうど・上限+1ms の遅延 → どちらも指定時刻ちょうどに発火する", async () => {
      const atLimit = vi.fn().mockResolvedValue(undefined);
      const overLimit = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("at-limit", MAX_TIMEOUT_DELAY_MS, atLimit);
      scheduler.addOneTimeJob(
        "over-limit",
        MAX_TIMEOUT_DELAY_MS + 1,
        overLimit,
      );

      await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_DELAY_MS - 1);
      expect(atLimit).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(atLimit).toHaveBeenCalledTimes(1);
      expect(overLimit).not.toHaveBeenCalled();
      expect(scheduler.hasJob("over-limit")).toBe(true);

      await vi.advanceTimersByTimeAsync(1);
      expect(overLimit).toHaveBeenCalledTimes(1);
    });

    // 張り直した区間のタイマーも unref され、プロセスの終了を妨げないこと
    it("張り直した区間のタイマーも unref される", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      scheduler.addOneTimeJob("long-unref", 30 * DAY_MS, vi.fn());
      await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_DELAY_MS);

      const handles = setTimeoutSpy.mock.results.map(
        (result) => result.value as NodeJS.Timeout,
      );
      expect(handles).toHaveLength(2);
      for (const handle of handles) {
        expect(handle.hasRef()).toBe(false);
      }
    });

    // 張り直し後の区間でも removeJob が効き、以後発火しないこと
    it("張り直し中に removeJob → true を返し、以後発火しない", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("long-remove", 30 * DAY_MS, task);
      await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_DELAY_MS + 1_000);
      expect(scheduler.hasJob("long-remove")).toBe(true);

      expect(scheduler.removeJob("long-remove")).toBe(true);
      expect(scheduler.hasJob("long-remove")).toBe(false);

      await vi.advanceTimersByTimeAsync(90 * DAY_MS);
      expect(task).not.toHaveBeenCalled();
    });

    // 張り直し後の区間で同 ID を登録し直すと、古いジョブは発火せず新しい予定だけが発火すること
    it("張り直し中に同 ID で再登録 → 古いジョブは発火せず、新しい期限で1回だけ発火する", async () => {
      const oldTask = vi.fn().mockResolvedValue(undefined);
      const newTask = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("long-replace", 30 * DAY_MS, oldTask);
      await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_DELAY_MS + 1_000);

      // 置き換え時点から30日（古い期限より後）で登録し直す
      scheduler.addOneTimeJob("long-replace", 30 * DAY_MS, newTask);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("system:scheduler.job_exists"),
      );
      expect(scheduler.getJobIds()).toEqual(["long-replace"]);

      // 古いジョブの期限を過ぎても何も発火しない
      await vi.advanceTimersByTimeAsync(30 * DAY_MS - 1);
      expect(oldTask).not.toHaveBeenCalled();
      expect(newTask).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(oldTask).not.toHaveBeenCalled();
      expect(newTask).toHaveBeenCalledTimes(1);
    });

    // 張り直し後の区間でも stopAll が効き、以後発火しないこと
    it("張り直し中に stopAll → すべて止まり、以後発火しない", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("long-stop", 30 * DAY_MS, task);
      await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_DELAY_MS + 1_000);

      scheduler.stopAll();
      expect(scheduler.getJobCount()).toBe(0);

      await vi.advanceTimersByTimeAsync(90 * DAY_MS);
      expect(task).not.toHaveBeenCalled();
    });
  });

  // 有限でない遅延は発火時刻が決まらないため、即時発火させずに登録自体を拒否することを検証
  describe("addOneTimeJob（有限でない遅延）", () => {
    it.each([
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY],
    ])(
      "%s → エラーをログに出して登録せず、発火もしない",
      async (_label, delayMs) => {
        const task = vi.fn().mockResolvedValue(undefined);

        scheduler.addOneTimeJob("invalid-delay", delayMs, task);

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining("system:scheduler.invalid_delay"),
        );
        expect(scheduler.hasJob("invalid-delay")).toBe(false);

        await vi.advanceTimersByTimeAsync(90 * DAY_MS);
        expect(task).not.toHaveBeenCalled();
      },
    );

    // 拒否した登録は副作用を持たず、同 ID の既存ジョブを消さないこと
    it("同 ID の既存ジョブがある場合 → 既存ジョブを残し、元の期限で発火する", async () => {
      const existing = vi.fn().mockResolvedValue(undefined);
      const rejected = vi.fn().mockResolvedValue(undefined);

      scheduler.addOneTimeJob("keep-existing", 1_000, existing);
      scheduler.addOneTimeJob("keep-existing", Number.NaN, rejected);

      expect(logger.warn).not.toHaveBeenCalled();
      expect(scheduler.hasJob("keep-existing")).toBe(true);

      await vi.advanceTimersByTimeAsync(1_000);
      expect(existing).toHaveBeenCalledTimes(1);
      expect(rejected).not.toHaveBeenCalled();
    });
  });
});
