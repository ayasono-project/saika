// tests/unit/bot/features/bump-reminder/services/usecases/setBumpReminderUsecase.test.ts
import { setBumpReminderUsecase } from "@/bot/features/bump-reminder/services/usecases/setBumpReminderUsecase";

const toBumpReminderJobIdMock = vi.fn();
const toBumpReminderKeyMock = vi.fn();
const toScheduledAtMock = vi.fn();
const scheduleReminderInMemoryMock = vi.fn();
const createTrackedReminderTaskMock = vi.fn();
const loggerInfoMock = vi.fn();

vi.mock("@/bot/features/bump-reminder/constants/bumpReminderConstants", () => ({
  toBumpReminderJobId: (...args: unknown[]) => toBumpReminderJobIdMock(...args),
  toBumpReminderKey: (...args: unknown[]) => toBumpReminderKeyMock(...args),
  toScheduledAt: (...args: unknown[]) => toScheduledAtMock(...args),
}));

vi.mock(
  "@/bot/features/bump-reminder/services/helpers/bumpReminderScheduleHelper",
  () => ({
    scheduleReminderInMemory: (...args: unknown[]) =>
      scheduleReminderInMemoryMock(...args),
  }),
);

vi.mock(
  "@/bot/features/bump-reminder/services/helpers/bumpReminderTrackedTask",
  () => ({
    createTrackedReminderTask: (...args: unknown[]) =>
      createTrackedReminderTaskMock(...args),
  }),
);

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
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

// setBumpReminderUsecase がリマインダーの DB 登録・インメモリスケジュール・既存リマインダーのキャンセルを
// 正しいタイミングで行うかを検証する
describe("bot/features/bump-reminder/services/usecases/setBumpReminderUsecase", () => {
  // 各テストが独立した初期状態で動くよう、モックの呼び出し履歴と戻り値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    toBumpReminderJobIdMock.mockReturnValue("job-g1");
    toBumpReminderKeyMock.mockImplementation(
      (guildId: string, serviceName?: string) =>
        serviceName ? `${guildId}:${serviceName}` : guildId,
    );
    toScheduledAtMock.mockReturnValue(new Date(Date.now() + 60_000));
    createTrackedReminderTaskMock.mockImplementation(
      (
        _repo: unknown,
        _guildId: string,
        _reminderId: string,
        task: () => Promise<void>,
      ) => task,
    );
  });

  it("既存リマインダーが存在しない通常フローで DB 作成とインメモリスケジュールが呼ばれることを確認", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    };
    const reminders = new Map<string, { jobId: string; reminderId: string }>();
    const cancelReminder = vi.fn().mockResolvedValue(true);
    const task = vi.fn().mockResolvedValue(undefined);

    await setBumpReminderUsecase({
      repository: repository as never,
      reminders,
      guildId: "g1",
      channelId: "c1",
      messageId: "m1",
      panelMessageId: "p1",
      delayMinutes: 1,
      task,
      serviceName: "Disboard" as never,
      cancelReminder,
    });

    expect(repository.create).toHaveBeenCalled();
    expect(scheduleReminderInMemoryMock).toHaveBeenCalled();
    expect(cancelReminder).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalled();
  });

  it("同一ギルドにすでにリマインダーが登録されている場合、新規スケジュール前に既存ジョブをキャンセルする", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "r1" }),
    };
    const reminders = new Map<string, { jobId: string; reminderId: string }>([
      ["g1", { jobId: "job-old", reminderId: "r-old" }],
    ]);
    const cancelReminder = vi.fn().mockResolvedValue(true);

    await setBumpReminderUsecase({
      repository: repository as never,
      reminders,
      guildId: "g1",
      channelId: "c1",
      messageId: undefined,
      panelMessageId: undefined,
      delayMinutes: 1,
      task: vi.fn().mockResolvedValue(undefined),
      serviceName: undefined,
      cancelReminder,
    });

    expect(cancelReminder).toHaveBeenCalledWith("g1", undefined);
    expect(scheduleReminderInMemoryMock).toHaveBeenCalled();
  });
});
