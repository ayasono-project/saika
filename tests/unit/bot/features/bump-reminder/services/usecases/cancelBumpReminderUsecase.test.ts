// tests/unit/bot/features/bump-reminder/services/usecases/cancelBumpReminderUsecase.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import { cancelBumpReminderUsecase } from "@/bot/features/bump-reminder/services/usecases/cancelBumpReminderUsecase";

const cancelScheduledReminderMock = vi.fn();
const loggerInfoMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock(
  "@/bot/features/bump-reminder/services/helpers/bumpReminderScheduleHelper",
  () => ({
    cancelScheduledReminder: (...args: unknown[]) =>
      cancelScheduledReminderMock(...args),
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
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

describe("bot/features/bump-reminder/services/usecases/cancelBumpReminderUsecase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("スケジュールされたリマインダーが存在しない場合は false を返す", async () => {
    cancelScheduledReminderMock.mockReturnValue(undefined);
    const repository = { updateStatus: vi.fn() };

    const result = await cancelBumpReminderUsecase({
      repository: repository as never,
      reminders: new Map(),
      guildId: "g1",
    });

    expect(result).toBe(false);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("リマインダーが存在する場合はステータスを cancelled に更新する", async () => {
    cancelScheduledReminderMock.mockReturnValue({
      jobId: "job-1",
      reminderId: "r1",
    });
    const repository = { updateStatus: vi.fn().mockResolvedValue(undefined) };

    const result = await cancelBumpReminderUsecase({
      repository: repository as never,
      reminders: new Map(),
      guildId: "g1",
    });

    expect(result).toBe(true);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "r1",
      BUMP_REMINDER_STATUS.CANCELLED,
    );
    expect(loggerInfoMock).toHaveBeenCalled();
  });
});
