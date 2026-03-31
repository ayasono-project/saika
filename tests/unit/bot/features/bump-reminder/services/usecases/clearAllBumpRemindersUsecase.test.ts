// tests/unit/bot/features/bump-reminder/services/usecases/clearAllBumpRemindersUsecase.test.ts
import { clearAllBumpRemindersUsecase } from "@/bot/features/bump-reminder/services/usecases/clearAllBumpRemindersUsecase";

const loggerErrorMock = vi.fn();

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
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

describe("bot/features/bump-reminder/services/usecases/clearAllBumpRemindersUsecase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("追跡中のすべてのリマインダーキーに対して cancelByKey を呼ぶ", async () => {
    const cancelByKey = vi.fn().mockResolvedValue(true);
    const reminders = new Map([
      ["g1", { jobId: "job-1", reminderId: "r1" }],
      ["g2", { jobId: "job-2", reminderId: "r2" }],
    ]);

    await clearAllBumpRemindersUsecase({ reminders, cancelByKey });

    expect(cancelByKey).toHaveBeenCalledWith("g1");
    expect(cancelByKey).toHaveBeenCalledWith("g2");
  });

  it("キャンセル処理のひとつが reject された場合はエラーログを記録する", async () => {
    const cancelByKey = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("failed"));
    const reminders = new Map([
      ["g1", { jobId: "job-1", reminderId: "r1" }],
      ["g2", { jobId: "job-2", reminderId: "r2" }],
    ]);

    await clearAllBumpRemindersUsecase({ reminders, cancelByKey });

    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
