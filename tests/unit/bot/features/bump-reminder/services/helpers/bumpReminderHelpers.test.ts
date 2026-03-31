// tests/unit/bot/features/bump-reminder/services/helpers/bumpReminderHelpers.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import type { BumpReminder } from "@/bot/features/bump-reminder/repositories/types";
import {
  type BumpReminderRestorePlan,
  createBumpReminderRestorePlan,
} from "@/bot/features/bump-reminder/services/helpers/bumpReminderRestorePlanner";
import {
  cancelScheduledReminder,
  type ScheduledReminderRef,
  scheduleReminderInMemory,
} from "@/bot/features/bump-reminder/services/helpers/bumpReminderScheduleHelper";
import { createTrackedReminderTask } from "@/bot/features/bump-reminder/services/helpers/bumpReminderTrackedTask";
import { logger } from "@/shared/utils/logger";

const addOneTimeJobMock = vi.fn();
const removeJobMock = vi.fn();

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
  tDefault: vi.fn((key: string) => key),
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

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    addOneTimeJob: (...args: unknown[]) => addOneTimeJobMock(...args),
    removeJob: (...args: unknown[]) => removeJobMock(...args),
  },
}));

describe("bot/features/bump-reminder/helpers", () => {
  // 各ヘルパーの状態遷移を独立に検証できるようモック履歴を初期化
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // guild ごとの pending 正規化で最新1件を選別できることを検証
  describe("createBumpReminderRestorePlan", () => {
    const buildReminder = (
      id: string,
      guildId: string,
      scheduledAt: string,
    ): BumpReminder => ({
      id,
      guildId,
      channelId: `ch-${guildId}`,
      messageId: null,
      panelMessageId: null,
      serviceName: null,
      scheduledAt: new Date(scheduledAt),
      status: BUMP_REMINDER_STATUS.PENDING,
      createdAt: new Date("2026-02-20T00:00:00.000Z"),
      updatedAt: new Date("2026-02-20T00:00:00.000Z"),
    });

    it("ギルドごとに最新の pending リマインダーを保持し古いものを収集する", () => {
      const reminders = [
        buildReminder("old-a", "g-a", "2026-02-20T00:10:00.000Z"),
        buildReminder("new-a", "g-a", "2026-02-20T00:20:00.000Z"),
        buildReminder("only-b", "g-b", "2026-02-20T00:15:00.000Z"),
      ];

      const plan: BumpReminderRestorePlan =
        createBumpReminderRestorePlan(reminders);

      expect(plan.latestByGuild.get("g-a")?.id).toBe("new-a");
      expect(plan.latestByGuild.get("g-b")?.id).toBe("only-b");
      expect(plan.staleReminders.map((item) => item.id)).toEqual(["old-a"]);
    });

    it("後から処理された古いリマインダーを stale としてマークする", () => {
      const reminders = [
        buildReminder("new-a", "g-a", "2026-02-20T00:20:00.000Z"),
        buildReminder("old-a", "g-a", "2026-02-20T00:10:00.000Z"),
      ];

      const plan = createBumpReminderRestorePlan(reminders);

      expect(plan.latestByGuild.get("g-a")?.id).toBe("new-a");
      expect(plan.staleReminders.map((item) => item.id)).toEqual(["old-a"]);
    });
  });

  // メモリ上スケジュールの登録と解除が整合することを検証
  describe("schedule helper", () => {
    it("ワンタイムタスクをスケジュールし、タスク実行後にリマインダーマップをクリアする", async () => {
      const reminders = new Map<string, ScheduledReminderRef>();
      const task = vi.fn().mockResolvedValue(undefined);

      let capturedTask: (() => Promise<void>) | undefined;
      addOneTimeJobMock.mockImplementationOnce(
        (_jobId: string, _delayMs: number, callback: () => Promise<void>) => {
          capturedTask = callback;
        },
      );

      scheduleReminderInMemory(reminders, "g-1", "job-1", "rem-1", 1000, task);

      expect(reminders.get("g-1")).toEqual({
        jobId: "job-1",
        reminderId: "rem-1",
      });

      await capturedTask?.();

      expect(task).toHaveBeenCalledTimes(1);
      expect(reminders.has("g-1")).toBe(false);
    });

    it("スケジューラーとメモリマップから既存のリマインダーをキャンセルする", () => {
      const reminders = new Map<string, ScheduledReminderRef>();
      reminders.set("g-1", { jobId: "job-1", reminderId: "rem-1" });

      const removed = cancelScheduledReminder(reminders, "g-1");

      expect(removed).toEqual({ jobId: "job-1", reminderId: "rem-1" });
      expect(removeJobMock).toHaveBeenCalledWith("job-1");
      expect(reminders.has("g-1")).toBe(false);
    });

    it("スケジュールされたリマインダーが存在しない場合は undefined を返す", () => {
      const reminders = new Map<string, ScheduledReminderRef>();

      const removed = cancelScheduledReminder(reminders, "missing-guild");

      expect(removed).toBeUndefined();
      expect(removeJobMock).not.toHaveBeenCalled();
    });
  });

  // タスク結果に応じた DB ステータス更新と失敗時補償を検証
  describe("createTrackedReminderTask", () => {
    it("タスク成功時にステータスを sent に更新する", async () => {
      const repository = {
        updateStatus: vi.fn().mockResolvedValue(undefined),
      };
      const task = vi.fn().mockResolvedValue(undefined);

      const trackedTask = createTrackedReminderTask(
        repository as never,
        "guild-1",
        "rem-1",
        task,
      );

      await trackedTask();

      expect(task).toHaveBeenCalledTimes(1);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        "rem-1",
        BUMP_REMINDER_STATUS.SENT,
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("タスク失敗時にステータスを cancelled に更新する", async () => {
      const repository = {
        updateStatus: vi.fn().mockResolvedValue(undefined),
      };
      const task = vi.fn().mockRejectedValue(new Error("task failed"));

      const trackedTask = createTrackedReminderTask(
        repository as never,
        "guild-2",
        "rem-2",
        task,
      );

      await trackedTask();

      expect(repository.updateStatus).toHaveBeenCalledWith(
        "rem-2",
        BUMP_REMINDER_STATUS.CANCELLED,
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("タスクとステータス更新の両方が失敗した場合は 2 回ログを記録する", async () => {
      const repository = {
        updateStatus: vi.fn().mockRejectedValue(new Error("db failed")),
      };
      const task = vi.fn().mockRejectedValue(new Error("task failed"));

      const trackedTask = createTrackedReminderTask(
        repository as never,
        "guild-3",
        "rem-3",
        task,
      );

      await trackedTask();

      expect(repository.updateStatus).toHaveBeenCalledWith(
        "rem-3",
        BUMP_REMINDER_STATUS.CANCELLED,
      );
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
