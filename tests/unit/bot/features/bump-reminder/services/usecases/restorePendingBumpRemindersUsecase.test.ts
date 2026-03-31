// tests/unit/bot/features/bump-reminder/services/usecases/restorePendingBumpRemindersUsecase.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import { restorePendingBumpRemindersUsecase } from "@/bot/features/bump-reminder/services/usecases/restorePendingBumpRemindersUsecase";

const createBumpReminderRestorePlanMock = vi.fn();
const isBumpServiceNameMock = vi.fn();
const toBumpReminderJobIdMock = vi.fn();
const toBumpReminderKeyMock = vi.fn();
const scheduleReminderInMemoryMock = vi.fn();
const createTrackedReminderTaskMock = vi.fn();
const loggerInfoMock = vi.fn();

vi.mock(
  "@/bot/features/bump-reminder/services/helpers/bumpReminderRestorePlanner",
  () => ({
    createBumpReminderRestorePlan: (...args: unknown[]) =>
      createBumpReminderRestorePlanMock(...args),
  }),
);

vi.mock("@/bot/features/bump-reminder/constants/bumpReminderConstants", () => ({
  BUMP_REMINDER_STATUS: {
    PENDING: "pending",
    SENT: "sent",
    CANCELLED: "cancelled",
  },
  isBumpServiceName: (...args: unknown[]) => isBumpServiceNameMock(...args),
  toBumpReminderJobId: (...args: unknown[]) => toBumpReminderJobIdMock(...args),
  toBumpReminderKey: (...args: unknown[]) => toBumpReminderKeyMock(...args),
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

// バンプリマインダーの起動時復元ユースケースを検証する
// 古い（stale）リマインダーのキャンセル処理・将来分のスケジュール登録・即時実行の各分岐を網羅する
describe("bot/features/bump-reminder/services/usecases/restorePendingBumpRemindersUsecase", () => {
  // 各テストでモックの呼び出し状態をリセットし、デフォルトの正常系戻り値を設定する
  beforeEach(() => {
    vi.clearAllMocks();
    isBumpServiceNameMock.mockReturnValue(true);
    toBumpReminderJobIdMock.mockReturnValue("job-g1");
    toBumpReminderKeyMock.mockReturnValue("g1:Disboard");
    createTrackedReminderTaskMock.mockImplementation(
      (
        _repo: unknown,
        _guildId: string,
        _reminderId: string,
        task: () => Promise<void>,
      ) => task,
    );
  });

  it("stale リマインダーを CANCELLED に更新し、未来の最新リマインダーだけをインメモリスケジューラに登録することを検証", async () => {
    const stale = { id: "stale-1", guildId: "g1" };
    const latest = {
      id: "latest-1",
      guildId: "g1",
      channelId: "c1",
      messageId: "m1",
      panelMessageId: "p1",
      serviceName: "Disboard",
      scheduledAt: new Date(Date.now() + 60_000),
    };

    createBumpReminderRestorePlanMock.mockReturnValue({
      latestByGuild: new Map([["g1", latest]]),
      staleReminders: [stale],
    });

    const repository = {
      findAllPending: vi.fn().mockResolvedValue([stale, latest]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };
    const taskFactory = vi
      .fn()
      .mockReturnValue(vi.fn().mockResolvedValue(undefined));

    const count = await restorePendingBumpRemindersUsecase({
      repository: repository as never,
      reminders: new Map(),
      taskFactory,
    });

    expect(count).toBe(1);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "stale-1",
      BUMP_REMINDER_STATUS.CANCELLED,
    );
    expect(scheduleReminderInMemoryMock).toHaveBeenCalled();
    expect(taskFactory).toHaveBeenCalledWith(
      "g1",
      "c1",
      "m1",
      "p1",
      "Disboard",
    );
  });

  it("scheduledAt が過去日時の場合はスケジュール登録をスキップしてタスクを即時実行することを検証", async () => {
    const latest = {
      id: "latest-1",
      guildId: "g1",
      channelId: "c1",
      messageId: null,
      panelMessageId: null,
      serviceName: "Disboard",
      scheduledAt: new Date(Date.now() - 1000),
    };

    createBumpReminderRestorePlanMock.mockReturnValue({
      latestByGuild: new Map([["g1", latest]]),
      staleReminders: [],
    });

    const repository = {
      findAllPending: vi.fn().mockResolvedValue([latest]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };
    const immediateTask = vi.fn().mockResolvedValue(undefined);
    const taskFactory = vi.fn().mockReturnValue(immediateTask);

    const count = await restorePendingBumpRemindersUsecase({
      repository: repository as never,
      reminders: new Map(),
      taskFactory,
    });

    expect(count).toBe(1);
    expect(immediateTask).toHaveBeenCalledTimes(1);
    expect(scheduleReminderInMemoryMock).not.toHaveBeenCalled();
  });
});
