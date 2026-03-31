// tests/unit/bot/features/bump-reminder/handlers/sendBumpReminder.test.ts
import { BUMP_SERVICES } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import { sendBumpReminder } from "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder";

const getGuildTranslatorMock = vi.fn();
const tDefaultMock = vi.fn(
  (key: string, _options?: Record<string, unknown>) => key,
);

const loggerInfoMock = vi.fn();
const loggerDebugMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: (guildId: string) => getGuildTranslatorMock(guildId),
}));

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
  tDefault: (key: string, options?: Record<string, unknown>) =>
    tDefaultMock(key, options),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
  },
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

// sendBumpReminder ユースケースを検証: テキストチャンネル不在・無効化・正常送信の各シナリオをカバーする
describe("bot/features/bump-reminder/handlers/usecases/sendBumpReminder", () => {
  // モックの呼び出し記録をリセットし、翻訳関数がキーをそのまま返すデフォルト動作をセット
  beforeEach(() => {
    vi.clearAllMocks();
    getGuildTranslatorMock.mockResolvedValue((key: string) => key);
  });

  it("テキストベースでないチャンネルに対しては送信せず警告ログを出力することを確認", async () => {
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isTextBased: () => false }),
      },
      guilds: {
        cache: new Map([["guild-1", { id: "guild-1" }]]),
      },
    };
    const configService = { getBumpReminderConfigOrDefault: vi.fn() };

    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      BUMP_SERVICES.DISBOARD,
      configService as never,
    );

    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it("リマインダー設定で enabled: false の場合はメッセージ送信をスキップすることを確認", async () => {
    const send = vi.fn();
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          isTextBased: () => true,
          isSendable: () => true,
          send,
        }),
      },
    };
    const configService = {
      getBumpReminderConfigOrDefault: vi
        .fn()
        .mockResolvedValue({ enabled: false }),
    };

    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      BUMP_SERVICES.DISBOARD,
      configService as never,
    );

    expect(send).not.toHaveBeenCalled();
    expect(loggerDebugMock).toHaveBeenCalled();
  });

  it("ロールとユーザーのメンション文字列がリプライに含まれることを確認", async () => {
    const channel = {
      isTextBased: () => true,
      isSendable: () => true,
      send: vi.fn().mockResolvedValue(undefined),
    };
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue(channel),
      },
    };
    const configService = {
      getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
        enabled: true,
        mentionRoleId: "role-1",
        mentionUserIds: ["user-1"],
      }),
    };

    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      BUMP_SERVICES.DISBOARD,
      configService as never,
    );

    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("<@&role-1> <@user-1>"),
        reply: { messageReference: "msg-1" },
      }),
    );
    expect(loggerInfoMock).toHaveBeenCalled();
  });
});
