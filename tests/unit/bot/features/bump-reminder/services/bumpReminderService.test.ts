// tests/unit/bot/features/bump-reminder/services/bumpReminderService.test.ts
import {
  BumpReminderManager,
  getBumpReminderManager,
} from "@/bot/features/bump-reminder/services/bumpReminderService";
import { logger } from "@/shared/utils/logger";

const addOneTimeJobMock = vi.fn();
const removeJobMock = vi.fn();
const repositoryMock = {
  create: vi.fn(),
  findAllPending: vi.fn(),
  updateStatus: vi.fn(),
};

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

vi.mock("@/shared/utils/prisma", () => ({
  requirePrismaClient: vi.fn(() => ({})),
}));

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    addOneTimeJob: (...args: unknown[]) => addOneTimeJobMock(...args),
    removeJob: (...args: unknown[]) => removeJobMock(...args),
  },
}));

vi.mock(
  "@/bot/features/bump-reminder/repositories/bumpReminderRepository",
  () => ({
    getBumpReminderRepository: () => repositoryMock,
  }),
);

describe("shared/features/bump-reminder/manager", () => {
  // BumpReminderManager の分岐（重複処理・失敗時補償・復元）を重点検証
  let manager: BumpReminderManager;

  // 各ケースで時刻とモック状態を固定化
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-20T00:00:00.000Z"));
    vi.clearAllMocks();
    manager = new BumpReminderManager(repositoryMock as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("setReminder が one-time 登録し、実行後に sent 更新することを検証", async () => {
    repositoryMock.create.mockResolvedValueOnce({
      id: "rem-1",
      guildId: "g-1",
      channelId: "ch-1",
      messageId: "m-1",
      panelMessageId: "p-1",
      scheduledAt: new Date("2026-02-20T02:00:00.000Z"),
      status: "pending",
    });

    let capturedTask: (() => Promise<void>) | undefined;
    addOneTimeJobMock.mockImplementationOnce(
      (_jobId: string, _delayMs: number, task: () => Promise<void>) => {
        capturedTask = task;
      },
    );

    const task = vi.fn().mockResolvedValue(undefined);

    await manager.setReminder("g-1", "ch-1", "m-1", "p-1", 120, task);

    expect(addOneTimeJobMock).toHaveBeenCalledTimes(1);
    expect(manager.hasReminder("g-1")).toBe(true);

    await capturedTask?.();

    expect(task).toHaveBeenCalledTimes(1);
    expect(repositoryMock.updateStatus).toHaveBeenCalledWith("rem-1", "sent");
    expect(manager.hasReminder("g-1")).toBe(false);
  });

  it("task 失敗時は cancelled 更新し、更新失敗時もログして握りつぶすことを検証", async () => {
    repositoryMock.create.mockResolvedValueOnce({
      id: "rem-2",
      guildId: "g-2",
      channelId: "ch-2",
      messageId: null,
      panelMessageId: null,
      scheduledAt: new Date("2026-02-20T02:00:00.000Z"),
      status: "pending",
    });

    let capturedTask: (() => Promise<void>) | undefined;
    addOneTimeJobMock.mockImplementationOnce(
      (_jobId: string, _delayMs: number, task: () => Promise<void>) => {
        capturedTask = task;
      },
    );

    const task = vi.fn().mockRejectedValue(new Error("task failed"));
    repositoryMock.updateStatus.mockRejectedValueOnce(
      new Error("status update failed"),
    );

    await manager.setReminder("g-2", "ch-2", undefined, undefined, 120, task);

    await capturedTask?.();

    expect(repositoryMock.updateStatus).toHaveBeenCalledWith(
      "rem-2",
      "cancelled",
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("bumpReminder:log.scheduler_task_failed"),
      expect.any(Error),
    );
  });

  it("既存リマインダーがある場合は先にキャンセルしてから再設定することを検証", async () => {
    repositoryMock.create
      .mockResolvedValueOnce({
        id: "old-rem",
        guildId: "g-3",
        channelId: "ch-3",
        messageId: null,
        panelMessageId: null,
        scheduledAt: new Date("2026-02-20T02:00:00.000Z"),
        status: "pending",
      })
      .mockResolvedValueOnce({
        id: "new-rem",
        guildId: "g-3",
        channelId: "ch-3",
        messageId: null,
        panelMessageId: null,
        scheduledAt: new Date("2026-02-20T03:00:00.000Z"),
        status: "pending",
      });

    addOneTimeJobMock.mockImplementation(
      (_jobId, _delayMs, _task) => undefined,
    );
    removeJobMock.mockReturnValue(true);

    await manager.setReminder(
      "g-3",
      "ch-3",
      undefined,
      undefined,
      120,
      vi.fn(),
    );
    await manager.setReminder(
      "g-3",
      "ch-3",
      undefined,
      undefined,
      180,
      vi.fn(),
    );

    expect(removeJobMock).toHaveBeenCalledTimes(1);
    expect(repositoryMock.updateStatus).toHaveBeenCalledWith(
      "old-rem",
      "cancelled",
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("bumpReminder:log.scheduler_cancelling"),
    );
  });

  it("cancelReminder は DB更新失敗時でも true を返し、メモリ状態を解放することを検証", async () => {
    repositoryMock.create.mockResolvedValueOnce({
      id: "rem-4",
      guildId: "g-4",
      channelId: "ch-4",
      messageId: null,
      panelMessageId: null,
      scheduledAt: new Date("2026-02-20T02:00:00.000Z"),
      status: "pending",
    });

    addOneTimeJobMock.mockImplementation(
      (_jobId, _delayMs, _task) => undefined,
    );
    repositoryMock.updateStatus.mockRejectedValueOnce(new Error("db failed"));

    await manager.setReminder(
      "g-4",
      "ch-4",
      undefined,
      undefined,
      120,
      vi.fn(),
    );

    const result = await manager.cancelReminder("g-4");

    expect(result).toBe(true);
    expect(removeJobMock).toHaveBeenCalledTimes(1);
    expect(manager.hasReminder("g-4")).toBe(false);
  });

  it("未登録ギルドの cancelReminder は false を返すことを検証", async () => {
    await expect(manager.cancelReminder("missing-guild")).resolves.toBe(false);
  });

  it("restorePendingReminders は重複pendingを古い順にキャンセルし、最新のみ復元することを検証", async () => {
    const now = new Date("2026-02-20T00:00:00.000Z");
    repositoryMock.findAllPending.mockResolvedValueOnce([
      {
        id: "old-a",
        guildId: "g-a",
        channelId: "ch-a",
        messageId: null,
        panelMessageId: null,
        serviceName: "Disboard",
        scheduledAt: new Date("2026-02-20T00:10:00.000Z"),
      },
      {
        id: "new-a",
        guildId: "g-a",
        channelId: "ch-a",
        messageId: "m-a",
        panelMessageId: "p-a",
        serviceName: "Disboard",
        scheduledAt: new Date("2026-02-20T00:20:00.000Z"),
      },
      {
        id: "past-b",
        guildId: "g-b",
        channelId: "ch-b",
        messageId: null,
        panelMessageId: null,
        serviceName: "Dissoku",
        scheduledAt: new Date(now.getTime() - 60_000),
      },
    ]);

    addOneTimeJobMock.mockImplementation(
      (_jobId, _delayMs, _task) => undefined,
    );

    const futureTask = vi.fn().mockResolvedValue(undefined);
    const immediateTask = vi.fn().mockResolvedValue(undefined);

    const taskFactory = vi
      .fn()
      .mockReturnValueOnce(futureTask)
      .mockReturnValueOnce(immediateTask);

    const restored = await manager.restorePendingReminders(taskFactory);

    expect(restored).toBe(2);
    expect(repositoryMock.updateStatus).toHaveBeenCalledWith(
      "old-a",
      "cancelled",
    );
    expect(taskFactory).toHaveBeenNthCalledWith(
      1,
      "g-a",
      "ch-a",
      "m-a",
      "p-a",
      "Disboard",
    );
    expect(taskFactory).toHaveBeenNthCalledWith(
      2,
      "g-b",
      "ch-b",
      undefined,
      undefined,
      "Dissoku",
    );
    expect(immediateTask).toHaveBeenCalledTimes(1);
    expect(repositoryMock.updateStatus).toHaveBeenCalledWith("past-b", "sent");
  });

  it("重複判定の else 分岐（既存より古いレコード）で toCancel へ積まれることを検証", async () => {
    repositoryMock.findAllPending.mockResolvedValueOnce([
      {
        id: "new-first",
        guildId: "g-dup",
        channelId: "ch-dup",
        messageId: null,
        panelMessageId: null,
        serviceName: "Disboard",
        scheduledAt: new Date("2026-02-20T00:30:00.000Z"),
      },
      {
        id: "old-second",
        guildId: "g-dup",
        channelId: "ch-dup",
        messageId: null,
        panelMessageId: null,
        serviceName: "Disboard",
        scheduledAt: new Date("2026-02-20T00:10:00.000Z"),
      },
    ]);

    addOneTimeJobMock.mockImplementation(
      (_jobId, _delayMs, _task) => undefined,
    );
    const taskFactory = vi.fn(() => vi.fn().mockResolvedValue(undefined));

    await manager.restorePendingReminders(taskFactory);

    expect(repositoryMock.updateStatus).toHaveBeenCalledWith(
      "old-second",
      "cancelled",
    );
  });

  it("clearAll の allSettled で reject が混ざる場合にエラーログすることを検証", async () => {
    (
      manager as unknown as {
        reminders: Map<string, { jobId: string; reminderId: string }>;
      }
    ).reminders.set("g-x", { jobId: "job-x", reminderId: "r-x" });

    const cancelSpy = vi
      .spyOn(manager, "cancelReminder")
      .mockRejectedValueOnce(new Error("cancel failed"));

    await manager.clearAll();

    expect(cancelSpy).toHaveBeenCalledWith("g-x");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("bumpReminder:log.scheduler_task_failed"),
      expect.any(Error),
    );
  });

  it("重複なし復元時は duplicate-cancel ログを出さず、serviceName 未指定で taskFactory を呼ぶことを検証", async () => {
    repositoryMock.findAllPending.mockResolvedValueOnce([
      {
        id: "uniq-1",
        guildId: "g-uniq",
        channelId: "ch-uniq",
        messageId: null,
        panelMessageId: null,
        serviceName: undefined,
        scheduledAt: new Date("2026-02-20T01:00:00.000Z"),
      },
    ]);

    addOneTimeJobMock.mockImplementation(
      (_jobId, _delayMs, _task) => undefined,
    );
    const taskFactory = vi.fn(() => vi.fn().mockResolvedValue(undefined));

    const restored = await manager.restorePendingReminders(taskFactory);

    expect(restored).toBe(1);
    expect(taskFactory).toHaveBeenCalledWith(
      "g-uniq",
      "ch-uniq",
      undefined,
      undefined,
      undefined,
    );
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "bumpReminder:log.scheduler_duplicates_cancelled",
      ),
    );
  });

  it("clearAll ですべて成功した場合は reject ログを出さないことを検証", async () => {
    (
      manager as unknown as {
        reminders: Map<string, { jobId: string; reminderId: string }>;
      }
    ).reminders.set("g-ok", { jobId: "job-ok", reminderId: "r-ok" });

    const cancelSpy = vi
      .spyOn(manager, "cancelReminder")
      .mockResolvedValueOnce(true);

    await manager.clearAll();

    expect(cancelSpy).toHaveBeenCalledWith("g-ok");
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.stringContaining("bumpReminder:log.scheduler_task_failed"),
      expect.anything(),
    );
  });

  it("初期化前に repository なしで getBumpReminderManager を呼ぶと例外になることを検証", () => {
    expect(() => getBumpReminderManager()).toThrow(
      "BumpReminderManager is not initialized. Initialize in composition root first.",
    );
  });

  it("getBumpReminderManager は同一インスタンスを返すことを検証", () => {
    const first = getBumpReminderManager(repositoryMock as never);
    const second = getBumpReminderManager();

    expect(first).toBe(second);
    expect(first).toBeInstanceOf(BumpReminderManager);
  });
});
