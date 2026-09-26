import { resetBumpReminderSettings } from "@/features/bump-reminder/handlers/usecases/resetBumpReminderSettings";

const saveBumpReminderSettingsMock = vi.fn();
const cancelGuildBumpRemindersMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    saveBumpReminderSettings: (...args: unknown[]) =>
      saveBumpReminderSettingsMock(...args),
  }),
}));

vi.mock(
  "@/features/bump-reminder/handlers/usecases/cancelGuildBumpReminders",
  () => ({
    cancelGuildBumpReminders: (...args: unknown[]) =>
      cancelGuildBumpRemindersMock(...args),
  }),
);

const client = { channels: { fetch: vi.fn() } };

// リセットが「一度も設定していないギルド」と同じ状態を保存し、進行中の予約を取り消すことを検証
describe("features/bump-reminder/handlers/usecases/resetBumpReminderSettings", () => {
  // ケースごとに呼び出し記録を消し、保存・取り消しとも成功させる
  beforeEach(() => {
    vi.clearAllMocks();
    saveBumpReminderSettingsMock.mockResolvedValue(undefined);
    cancelGuildBumpRemindersMock.mockResolvedValue(0);
  });

  it("機能は有効・全チャンネル・メンションなしで保存し、保存した設定を返す", async () => {
    const expected = {
      enabled: true,
      channelId: undefined,
      mentionRoleId: undefined,
      mentionUserIds: [],
    };

    const result = await resetBumpReminderSettings(client as never, "g-1");

    expect(saveBumpReminderSettingsMock).toHaveBeenCalledWith("g-1", expected);
    expect(result).toEqual(expected);
  });

  it("設定を保存してから、進行中の予約とパネルを取り消す", async () => {
    await resetBumpReminderSettings(client as never, "g-1");

    expect(cancelGuildBumpRemindersMock).toHaveBeenCalledWith(client, "g-1");
    expect(
      saveBumpReminderSettingsMock.mock.invocationCallOrder[0],
    ).toBeLessThan(cancelGuildBumpRemindersMock.mock.invocationCallOrder[0]);
  });

  it("設定の保存に失敗した場合は予約を取り消さずに例外を返す", async () => {
    saveBumpReminderSettingsMock.mockRejectedValue(new Error("db down"));

    await expect(
      resetBumpReminderSettings(client as never, "g-1"),
    ).rejects.toThrow("db down");
    expect(cancelGuildBumpRemindersMock).not.toHaveBeenCalled();
  });
});
