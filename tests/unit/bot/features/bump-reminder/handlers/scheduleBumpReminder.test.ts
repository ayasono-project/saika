// tests/unit/bot/features/bump-reminder/handlers/scheduleBumpReminder.test.ts
import { scheduleBumpReminder } from "@/bot/features/bump-reminder/handlers/usecases/scheduleBumpReminder";

const SERVICE_NAME = "Disboard" as const;

const getReminderDelayMinutesMock = vi.fn();
const getBotBumpReminderManagerMock = vi.fn();
const setReminderMock = vi.fn();
const sendBumpReminderMock = vi.fn();

vi.mock("@/bot/features/bump-reminder/constants/bumpReminderConstants", () => ({
  getReminderDelayMinutes: (...args: unknown[]) =>
    getReminderDelayMinutesMock(...args),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderManager: (...args: unknown[]) =>
    getBotBumpReminderManagerMock(...args),
}));

vi.mock(
  "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder",
  () => ({
    sendBumpReminder: (...args: unknown[]) => sendBumpReminderMock(...args),
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
    debug: vi.fn(),
  },
}));

// バンプリマインダーのスケジュール登録ユースケース全体を検証するグループ:
// 正常登録・登録済みタスクの実行内容を確認する
describe("bot/features/bump-reminder/handlers/usecases/scheduleBumpReminder", () => {
  // 各テスト前にモックをリセットし、リマインダー遅延120分とマネージャーの標準動作を設定する
  beforeEach(() => {
    vi.clearAllMocks();
    getReminderDelayMinutesMock.mockReturnValue(120);
    getBotBumpReminderManagerMock.mockReturnValue({
      setReminder: (...args: unknown[]) => setReminderMock(...args),
    });
  });

  it("遅延時間とサービス情報を指定してリマインダーを登録する", async () => {
    const client = { channels: { fetch: vi.fn() } };
    const configService = { getBumpReminderConfig: vi.fn() };

    await scheduleBumpReminder(
      client as never,
      "guild-1",
      "channel-1",
      "msg-1",
      SERVICE_NAME,
      configService as never,
      "panel-1",
    );

    expect(setReminderMock).toHaveBeenCalledTimes(1);
    expect(setReminderMock.mock.calls[0][0]).toBe("guild-1");
    expect(setReminderMock.mock.calls[0][4]).toBe(120);
    expect(setReminderMock.mock.calls[0][6]).toBe("Disboard");
  });

  it("登録されたタスクが sendBumpReminder を panelMessageId 付きで実行することを確認する", async () => {
    const client = { channels: { fetch: vi.fn() } };
    const configService = { getBumpReminderConfig: vi.fn() };

    await scheduleBumpReminder(
      client as never,
      "guild-1",
      "channel-1",
      "msg-1",
      SERVICE_NAME,
      configService as never,
      "panel-1",
    );

    const task = setReminderMock.mock.calls[0][5] as () => Promise<void>;
    await task();

    // panelMessageId も sendBumpReminder に渡してリマインド後にパネルを削除する
    expect(sendBumpReminderMock).toHaveBeenCalledWith(
      client,
      "guild-1",
      "channel-1",
      "msg-1",
      SERVICE_NAME,
      configService,
      "panel-1",
    );
  });

  it("リマインダー登録失敗時にエラーがそのまま伝播する", async () => {
    const client = { channels: { fetch: vi.fn() } };
    const configService = { getBumpReminderConfig: vi.fn() };
    setReminderMock.mockRejectedValueOnce(new Error("set failed"));

    await expect(
      scheduleBumpReminder(
        client as never,
        "guild-1",
        "channel-1",
        "msg-1",
        SERVICE_NAME,
        configService as never,
        "panel-1",
      ),
    ).rejects.toThrow("set failed");
  });
});
