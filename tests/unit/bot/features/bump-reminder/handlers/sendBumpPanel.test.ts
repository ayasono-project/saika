// tests/unit/bot/features/bump-reminder/handlers/sendBumpPanel.test.ts
import { sendBumpPanel } from "@/bot/features/bump-reminder/handlers/usecases/sendBumpPanel";

const toScheduledAtMock = vi.fn();
const getGuildTranslatorMock = vi.fn();
const tDefaultMock = vi.fn(
  (key: string, _options?: Record<string, unknown>) => key,
);
const createInfoEmbedMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/bot/features/bump-reminder/constants/bumpReminderConstants", () => ({
  BUMP_CONSTANTS: {
    CUSTOM_ID_PREFIX: {
      MENTION_ON: "on:",
      MENTION_OFF: "off:",
    },
  },
  toScheduledAt: (...args: unknown[]) => toScheduledAtMock(...args),
}));

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

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (...args: unknown[]) => createInfoEmbedMock(...args),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

// バンプリマインダーのパネルメッセージをチャンネルに送信するユースケースを検証するグループ
// チャンネルタイプ・送信成功・フェッチエラーの3パターンを網羅する
describe("bot/features/bump-reminder/handlers/usecases/sendBumpPanel", () => {
  // 各テストで送信モック・翻訳モック・スケジュール計算モックを一貫した初期状態にリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    toScheduledAtMock.mockReturnValue(new Date("2026-02-21T00:00:00.000Z"));
    getGuildTranslatorMock.mockResolvedValue(
      (key: string) =>
        ({
          "bumpReminder:user-response.panel_scheduled_at": "scheduled",
          "bumpReminder:embed.title.panel": "title",
          "bumpReminder:ui.button.mention_on": "on",
          "bumpReminder:ui.button.mention_off": "off",
        })[key] ?? key,
    );
    createInfoEmbedMock.mockReturnValue({
      title: "title",
      description: "scheduled",
    });
  });

  it("テキストベースでないチャンネル（VCなど）にはパネルを送らず undefined を返すことを確認", async () => {
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isTextBased: () => false }),
      },
    };

    const result = await sendBumpPanel(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      120,
    );

    expect(result).toBeUndefined();
  });

  it("パネルを送信してメッセージ ID を返す", async () => {
    const send = vi.fn().mockResolvedValue({ id: "panel-1" });
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          isTextBased: () => true,
          isSendable: () => true,
          send,
        }),
      },
    };

    const result = await sendBumpPanel(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      120,
    );

    expect(result).toBe("panel-1");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        reply: { messageReference: "msg-1" },
      }),
    );
  });

  it("チャンネルフェッチ自体が失敗した場合にエラーをログして undefined を返し、例外を上位に伝播させないことを確認", async () => {
    const error = new Error("fetch failed");
    const client = {
      channels: {
        fetch: vi.fn().mockRejectedValue(error),
      },
      guilds: {
        cache: new Map([["guild-1", { id: "guild-1" }]]),
      },
    };

    const result = await sendBumpPanel(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      120,
    );

    expect(result).toBeUndefined();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
