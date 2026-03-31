// tests/unit/bot/handlers/clientReadyHandler.test.ts

import { ActivityType, PresenceUpdateStatus } from "discord.js";
import { handleClientReady } from "@/bot/handlers/clientReadyHandler";

const tDefaultMock = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (key === "system:bot.presence_activity") {
    return `presence:${String(params?.count)}`;
  }
  return `default:${key}`;
});
const loggerInfoMock = vi.fn();
const restoreBumpRemindersOnStartupMock = vi.fn();
const cleanupVacOnStartupMock = vi.fn();
const initGuildInviteCacheMock = vi.fn();
const restoreAutoDeleteTimersMock = vi.fn();
const getBotTicketRepositoryMock = vi.fn();

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
  tDefault: (key: string, params?: Record<string, unknown>) =>
    tDefaultMock(key, params),
  tInteraction: (...args: unknown[]) => args[1],
}));

const loggerErrorMock = vi.fn();
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock("@/bot/features/bump-reminder/handlers/bumpReminderStartup", () => ({
  restoreBumpRemindersOnStartup: (...args: unknown[]) =>
    restoreBumpRemindersOnStartupMock(...args),
}));

vi.mock("@/bot/features/vac/handlers/vacStartupCleanup", () => ({
  cleanupVacOnStartup: (...args: unknown[]) => cleanupVacOnStartupMock(...args),
}));

vi.mock("@/bot/features/member-log/handlers/inviteTracker", () => ({
  initGuildInviteCache: (...args: unknown[]) =>
    initGuildInviteCacheMock(...args),
}));

vi.mock("@/bot/features/ticket/services/ticketAutoDeleteService", () => ({
  restoreAutoDeleteTimers: (...args: unknown[]) =>
    restoreAutoDeleteTimersMock(...args),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketRepository: (...args: unknown[]) =>
    getBotTicketRepositoryMock(...args),
}));

// clientReady ハンドラーが
// 起動ログ出力・プレゼンス設定・各スタートアップタスク（バンプリマインダー復元 / VAC クリーンアップ）の
// 実行順序とエラー伝播を正しく行うかを検証する
describe("bot/handlers/clientReadyHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreBumpRemindersOnStartupMock.mockResolvedValue(undefined);
    cleanupVacOnStartupMock.mockResolvedValue(undefined);
    initGuildInviteCacheMock.mockResolvedValue(undefined);
    restoreAutoDeleteTimersMock.mockResolvedValue(undefined);
    getBotTicketRepositoryMock.mockReturnValue({});
  });

  it("起動ログ・プレゼンス設定・各スタートアップタスクが正しく実行されることを確認", async () => {
    const setPresenceMock = vi.fn();
    const fakeGuilds = [{ id: "g1" }, { id: "g2" }, { id: "g3" }];
    const client = {
      user: { tag: "bot#0001", setPresence: setPresenceMock },
      guilds: {
        cache: {
          size: 3,
          map: (fn: (g: unknown) => unknown) => fakeGuilds.map(fn),
        },
      },
      users: { cache: { size: 10 } },
      commands: { size: 5 },
    };

    await handleClientReady(client as never);

    expect(loggerInfoMock).toHaveBeenCalledTimes(4);
    expect(setPresenceMock).toHaveBeenCalledWith({
      activities: [
        {
          name: "presence:3",
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
    });
    expect(initGuildInviteCacheMock).toHaveBeenCalledTimes(3);
    expect(restoreBumpRemindersOnStartupMock).toHaveBeenCalledWith(client);
    expect(cleanupVacOnStartupMock).toHaveBeenCalledWith(client);
  });

  it("先行スタートア���プタスクが失敗した場合にエラーがログされ例外は伝播しないことを確認", async () => {
    restoreBumpRemindersOnStartupMock.mockRejectedValueOnce(
      new Error("restore failed"),
    );
    const client = {
      user: { tag: "bot#0001", setPresence: vi.fn() },
      guilds: {
        cache: {
          size: 1,
          map: (fn: (g: unknown) => unknown) => [{ id: "g1" }].map(fn),
        },
      },
      users: { cache: { size: 1 } },
      commands: { size: 1 },
    };

    // try-catch で捕捉されるため例外は伝播しない
    await handleClientReady(client as never);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
    expect(cleanupVacOnStartupMock).not.toHaveBeenCalled();
  });
});
