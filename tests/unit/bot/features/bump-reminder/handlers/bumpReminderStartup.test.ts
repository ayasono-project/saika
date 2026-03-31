// tests/unit/bot/features/bump-reminder/handlers/bumpReminderStartup.test.ts
import { restoreBumpRemindersOnStartup } from "@/bot/features/bump-reminder/handlers/bumpReminderStartup";

const getBotBumpReminderConfigServiceMock = vi.fn();
const getBotBumpReminderManagerMock = vi.fn();
const restorePendingRemindersMock = vi.fn();
const loggerErrorMock = vi.fn();
const sendBumpReminderMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderConfigService: (...args: unknown[]) =>
    getBotBumpReminderConfigServiceMock(...args),
  getBotBumpReminderManager: (...args: unknown[]) =>
    getBotBumpReminderManagerMock(...args),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock(
  "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder",
  () => ({
    sendBumpReminder: (...args: unknown[]) => sendBumpReminderMock(...args),
  }),
);

// Bot 起動時のバンプリマインダー復元処理が
// タスクファクトリーを正しく構築して sendBumpReminder に委譲するか、
// および復元失敗をログに記録して例外を握り潰すかを検証する
describe("bot/features/bump-reminder/handlers/bumpReminderStartup", () => {
  // 各テストで依存サービスのモックが正しい初期状態（restorePendingReminders を持つオブジェクト）を返すよう準備する
  beforeEach(() => {
    vi.clearAllMocks();
    getBotBumpReminderConfigServiceMock.mockReturnValue({
      getBumpReminderConfig: vi.fn(),
    });
    getBotBumpReminderManagerMock.mockReturnValue({
      restorePendingReminders: (...args: unknown[]) =>
        restorePendingRemindersMock(...args),
    });
  });

  it("タスクファクトリーを構築して restorePendingReminders に委譲する", async () => {
    const client = { id: "client" };

    await restoreBumpRemindersOnStartup(client as never);

    expect(restorePendingRemindersMock).toHaveBeenCalledTimes(1);
    const [taskFactory] = restorePendingRemindersMock.mock.calls[0] as [
      (
        guildId: string,
        channelId: string,
        messageId?: string,
        panelMessageId?: string,
        serviceName?: "disboard" | "dissoku",
      ) => () => Promise<void>,
    ];
    const task = taskFactory(
      "guild-1",
      "channel-1",
      "msg-1",
      "panel-1",
      "disboard",
    );
    expect(typeof task).toBe("function");

    await task();
    // panelMessageId も sendBumpReminder に渡してリマインド後にパネルを削除する
    expect(sendBumpReminderMock).toHaveBeenCalledWith(
      client,
      "guild-1",
      "channel-1",
      "msg-1",
      "disboard",
      expect.any(Object),
      "panel-1",
    );
  });

  it("復元処理が失敗しても Bot 起動を止めないよう例外をキャッチしてエラーログのみ残すことを確認", async () => {
    restorePendingRemindersMock.mockRejectedValueOnce(
      new Error("restore failed"),
    );

    const client = { id: "client" };
    await expect(
      restoreBumpRemindersOnStartup(client as never),
    ).resolves.toBeUndefined();

    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
