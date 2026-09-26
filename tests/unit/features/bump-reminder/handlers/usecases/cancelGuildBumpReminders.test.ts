import { cancelGuildBumpReminders } from "@/features/bump-reminder/handlers/usecases/cancelGuildBumpReminders";

const findPendingByGuildMock = vi.fn();
const cancelAllForGuildMock = vi.fn();
const deleteBumpPanelMessageMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderRepository: () => ({
    findPendingByGuild: (...args: unknown[]) => findPendingByGuildMock(...args),
  }),
  getBotBumpReminderManager: () => ({
    cancelAllForGuild: (...args: unknown[]) => cancelAllForGuildMock(...args),
  }),
}));

vi.mock("@/features/bump-reminder/handlers/usecases/deleteBumpPanel", () => ({
  deleteBumpPanelMessage: (...args: unknown[]) =>
    deleteBumpPanelMessageMock(...args),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => loggerWarnMock(...args),
  },
}));

const client = { channels: { fetch: vi.fn() } };

// 予約の取り消しで、pending 行から控えたパネルも消し、取り消しそのものは必ず行うことを検証
describe("features/bump-reminder/handlers/usecases/cancelGuildBumpReminders", () => {
  // ケースごとに呼び出し記録を消し、既定では取り消し・削除とも成功させる
  beforeEach(() => {
    vi.clearAllMocks();
    cancelAllForGuildMock.mockResolvedValue(2);
    deleteBumpPanelMessageMock.mockResolvedValue(undefined);
  });

  it("取り消す前に pending 行を読み、予約を取り消してから、各予約のパネルを消す", async () => {
    findPendingByGuildMock.mockResolvedValue([
      { channelId: "ch-1", panelMessageId: "panel-disboard" },
      { channelId: "ch-2", panelMessageId: "panel-dissoku" },
    ]);

    const cancelled = await cancelGuildBumpReminders(client as never, "g-1");

    expect(cancelled).toBe(2);
    expect(findPendingByGuildMock).toHaveBeenCalledWith("g-1");
    expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
    expect(deleteBumpPanelMessageMock).toHaveBeenCalledWith(
      client,
      "ch-1",
      "panel-disboard",
      "g-1",
    );
    expect(deleteBumpPanelMessageMock).toHaveBeenCalledWith(
      client,
      "ch-2",
      "panel-dissoku",
      "g-1",
    );
    // 取り消すと pending から外れるので、読むのは取り消しより前でなければならない
    expect(findPendingByGuildMock.mock.invocationCallOrder[0]).toBeLessThan(
      cancelAllForGuildMock.mock.invocationCallOrder[0],
    );
    // パネルを消すのはタイマーを止めた後（消している間に発火させない）
    expect(cancelAllForGuildMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteBumpPanelMessageMock.mock.invocationCallOrder[0],
    );
  });

  it("pending 行が無い場合はパネル削除を呼ばずに予約だけ取り消す", async () => {
    findPendingByGuildMock.mockResolvedValue([]);
    cancelAllForGuildMock.mockResolvedValue(0);

    const cancelled = await cancelGuildBumpReminders(client as never, "g-1");

    expect(cancelled).toBe(0);
    expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
    expect(deleteBumpPanelMessageMock).not.toHaveBeenCalled();
  });

  it("pending 行の取得に失敗しても、警告ログを残して予約の取り消しは行う", async () => {
    findPendingByGuildMock.mockRejectedValue(new Error("db down"));

    const cancelled = await cancelGuildBumpReminders(client as never, "g-1");

    expect(cancelled).toBe(2);
    expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
    expect(deleteBumpPanelMessageMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).toHaveBeenCalledWith(
      `[system:log_prefix.bump_reminder] bumpReminder:log.scheduler_panel_lookup_failed:${JSON.stringify({ guildId: "g-1" })}`,
      expect.any(Error),
    );
  });
});
