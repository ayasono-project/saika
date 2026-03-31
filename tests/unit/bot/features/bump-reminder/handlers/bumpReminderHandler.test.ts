// tests/unit/bot/features/bump-reminder/handlers/bumpReminderHandler.test.ts
import { handleBumpDetected } from "@/bot/features/bump-reminder/handlers/bumpReminderHandler";
import { sendBumpPanel } from "@/bot/features/bump-reminder/handlers/usecases/sendBumpPanel";
import { sendBumpReminder } from "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder";

const getBotBumpReminderConfigServiceMock = vi.fn();
const scheduleBumpReminderMock = vi.fn();
const getGuildTranslatorMock = vi.fn();
const tDefaultMock = vi.fn(
  (key: string, _options?: Record<string, unknown>) => key,
);
const createInfoEmbedMock = vi.fn(
  (description: string, opts?: { title?: string }) => ({
    description,
    title: opts?.title,
  }),
);

const loggerMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const getReminderDelayMinutesMock = vi.fn(() => 120);
const toScheduledAtMock = vi.fn(
  (_delayMinutes: number) => new Date("2026-02-20T01:00:00.000Z"),
);

const getBotBumpReminderRepositoryMock = vi.fn(() => ({
  findPendingByGuildAndService: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderConfigService: () => getBotBumpReminderConfigServiceMock(),
  getBotBumpReminderRepository: () => getBotBumpReminderRepositoryMock(),
}));

vi.mock(
  "@/bot/features/bump-reminder/handlers/usecases/scheduleBumpReminder",
  () => ({
    scheduleBumpReminder: (...args: unknown[]) =>
      scheduleBumpReminderMock(...args),
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
  tDefault: (key: string, options?: Record<string, unknown>) =>
    tDefaultMock(key, options),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: (guildId: string) => getGuildTranslatorMock(guildId),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerMock.info(...args),
    debug: (...args: unknown[]) => loggerMock.debug(...args),
    warn: (...args: unknown[]) => loggerMock.warn(...args),
    error: (...args: unknown[]) => loggerMock.error(...args),
  },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (description: string, options?: { title?: string }) =>
    createInfoEmbedMock(description, options),
}));

vi.mock(
  "@/bot/features/bump-reminder/constants/bumpReminderConstants",
  async () => {
    const actual = await vi.importActual(
      "@/bot/features/bump-reminder/constants/bumpReminderConstants",
    );
    return {
      ...(actual as object),
      getReminderDelayMinutes: () => getReminderDelayMinutesMock(),
      toScheduledAt: (delayMinutes: number) => toScheduledAtMock(delayMinutes),
    };
  },
);

// bump-reminder handler の検知・パネル送信・通知送信の主要分岐を検証
describe("bot/features/bump-reminder/bumpReminderHandler", () => {
  // 各ケースのモック履歴を初期化し、前ケースの副作用を遮断する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // sendBumpPanel の送信条件分岐（text/sendable/例外）と payload 生成を検証
  describe("sendBumpPanel", () => {
    it("対象チャンネルがテキストベースでない場合は undefined を返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => false,
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

      expect(result).toBeUndefined();
    });

    it("チャンネルに送信不可の場合は undefined を返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            isSendable: () => false,
          }),
        },
      };

      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      const result = await sendBumpPanel(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        120,
      );

      expect(result).toBeUndefined();
    });

    it("ローカライズされた embed を含むパネルメッセージを送信してメッセージ ID を返す", async () => {
      const sendMock = vi.fn().mockResolvedValue({ id: "panel-1" });
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            isSendable: () => true,
            send: sendMock,
          }),
        },
      };

      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      const result = await sendBumpPanel(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        120,
      );

      expect(result).toBe("panel-1");
      expect(createInfoEmbedMock).toHaveBeenCalledWith(
        "bumpReminder:user-response.panel_scheduled_at",
        {
          title: "bumpReminder:embed.title.panel",
        },
      );
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
          reply: { messageReference: "msg-1" },
        }),
      );
    });

    it("チャンネルフェッチが例外を投げた場合は undefined を返してログに記録する", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
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
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_panel_send_failed"),
        expect.any(Error),
      );
    });
  });

  // sendBumpReminder の通知文生成・送信分岐・finally削除を検証
  describe("sendBumpReminder", () => {
    it("チャンネルがテキストベースでない場合は警告ログを出して返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => false,
          }),
        },
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };
      const repository = {
        getBumpReminderConfig: vi.fn(),
      };

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
      );

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_channel_not_found"),
      );
    });

    it("リマインダー設定が無効の場合は送信せず返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            isSendable: () => true,
            send: vi.fn(),
          }),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: false, mentionUserIds: [] }),
      };

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
      );

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_disabled"),
      );
    });

    it("ロール ID とユーザー ID からメンション文字列が構築され、サービス対応のフォーマットで送信されることを検証", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: "role-1",
          mentionUserIds: ["u-1", "u-2"],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
      );

      expect(sendMock).toHaveBeenCalledWith({
        content:
          "<@&role-1> <@u-1> <@u-2>\nbumpReminder:user-response.reminder_message_disboard",
        reply: { messageReference: "msg-1" },
      });
    });

    it("未知のサービスの場合はリプライ参照なしでプレーンメッセージを送信する", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        undefined,
        undefined,
        repository as never,
      );

      expect(sendMock).toHaveBeenCalledWith(
        "bumpReminder:user-response.reminder_message",
      );
    });

    it("サービスが DISSOKU の場合は Dissoku 用リマインダーメッセージを送信する", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        undefined,
        "Dissoku",
        repository as never,
      );

      expect(sendMock).toHaveBeenCalledWith(
        "bumpReminder:user-response.reminder_message_dissoku",
      );
    });

    it("任意のサービス名から翻訳キーが動的に組み立てられる", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      // 既存サービスではない任意のサービス名を渡す
      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        undefined,
        "NewService" as never,
        repository as never,
      );

      // サービス名が小文字化されてキーに組み込まれる
      expect(sendMock).toHaveBeenCalledWith(
        "bumpReminder:user-response.reminder_message_newservice",
      );
    });

    it("チャンネルに送信不可の場合はメッセージを送信しない", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => false,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
      );

      expect(sendMock).not.toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_sent"),
      );
    });

    it("リマインド送信後にパネルメッセージを削除する", async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined);
      const panelMessage = { delete: deleteMock };
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn().mockResolvedValue(panelMessage),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
        "panel-msg-1",
      );

      expect(channel.messages.fetch).toHaveBeenCalledWith("panel-msg-1");
      expect(deleteMock).toHaveBeenCalled();
    });

    it("panelMessageId が未指定の場合はパネル削除をスキップする", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn(),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
      );

      // panelMessageId 未指定なのでパネル削除のための messages.fetch は呼ばれない
      expect(channel.messages.fetch).not.toHaveBeenCalled();
    });

    it("パネル削除に失敗してもリマインド送信は成功扱いになる", async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn().mockRejectedValue(new Error("message not found")),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      const repository = {
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          mentionRoleId: null,
          mentionUserIds: [],
        }),
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await sendBumpReminder(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        repository as never,
        "panel-msg-1",
      );

      // リマインド送信自体は成功
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_sent"),
      );
    });
  });

  // handleBumpDetected の検知有効性判定・リマインダー登録・失敗時補償を検証
  describe("handleBumpDetected", () => {
    it("バンプリマインダーが無効の場合は早期リターンする", async () => {
      getBotBumpReminderConfigServiceMock.mockReturnValue({
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: false, mentionUserIds: [] }),
      });

      await handleBumpDetected(
        { channels: { fetch: vi.fn() } } as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.scheduler_disabled"),
      );
      expect(scheduleBumpReminderMock).not.toHaveBeenCalled();
    });

    it("設定されたチャンネルと一致しない場合は早期リターンする", async () => {
      getBotBumpReminderConfigServiceMock.mockReturnValue({
        getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue({
          enabled: true,
          channelId: "expected-ch",
          mentionUserIds: [],
        }),
      });

      await handleBumpDetected(
        { channels: { fetch: vi.fn() } } as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "bumpReminder:log.scheduler_unregistered_channel",
        ),
      );
      expect(scheduleBumpReminderMock).not.toHaveBeenCalled();
    });

    it("同一サービスの前回パネルを findPendingByGuildAndService で検索して削除する", async () => {
      const panelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const panelMessage = { delete: panelDeleteMock };
      const findPendingByGuildAndServiceMock = vi.fn().mockResolvedValue({
        panelMessageId: "old-panel-1",
        channelId: "ch-1",
      });
      getBotBumpReminderRepositoryMock.mockReturnValue({
        findPendingByGuildAndService: findPendingByGuildAndServiceMock,
      });

      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-1" });
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn().mockResolvedValue(panelMessage),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      // サービス名を指定して検索していること
      expect(findPendingByGuildAndServiceMock).toHaveBeenCalledWith(
        "guild-1",
        "Disboard",
      );
      // 前回パネルが削除されていること
      expect(channel.messages.fetch).toHaveBeenCalledWith("old-panel-1");
      expect(panelDeleteMock).toHaveBeenCalled();
    });

    it("前回パネルの panelMessageId が未設定の場合はパネル削除をスキップする", async () => {
      const findPendingByGuildAndServiceMock = vi.fn().mockResolvedValue({
        panelMessageId: undefined,
        channelId: "ch-1",
      });
      getBotBumpReminderRepositoryMock.mockReturnValue({
        findPendingByGuildAndService: findPendingByGuildAndServiceMock,
      });

      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-1" });
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: { fetch: vi.fn() },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      // panelMessageId が未設定なのでメッセージフェッチは呼ばれない
      expect(channel.messages.fetch).not.toHaveBeenCalled();
      // 新パネルは正常にスケジュールされる
      expect(scheduleBumpReminderMock).toHaveBeenCalled();
    });

    it("前回パネルのチャンネルフェッチが失敗した場合でも新パネル送信に影響しない", async () => {
      const findPendingByGuildAndServiceMock = vi.fn().mockResolvedValue({
        panelMessageId: "old-panel-1",
        channelId: "ch-old",
      });
      getBotBumpReminderRepositoryMock.mockReturnValue({
        findPendingByGuildAndService: findPendingByGuildAndServiceMock,
      });

      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-1" });
      // channels.fetch は最初の呼び出し（旧パネルチャンネル）で失敗、
      // 2回目（新パネルチャンネル）で成功する
      const client = {
        channels: {
          fetch: vi
            .fn()
            .mockRejectedValueOnce(new Error("channel not found"))
            .mockResolvedValue({
              isTextBased: () => true,
              isSendable: () => true,
              send: sendMock,
            }),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      // 旧パネル削除失敗にかかわらず新パネルがスケジュールされる
      expect(scheduleBumpReminderMock).toHaveBeenCalled();
    });

    it("前回パネルのメッセージフェッチが失敗した場合でも新パネル送信に影響しない", async () => {
      const findPendingByGuildAndServiceMock = vi.fn().mockResolvedValue({
        panelMessageId: "old-panel-1",
        channelId: "ch-1",
      });
      getBotBumpReminderRepositoryMock.mockReturnValue({
        findPendingByGuildAndService: findPendingByGuildAndServiceMock,
      });

      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-1" });
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
        messages: {
          fetch: vi.fn().mockRejectedValue(new Error("message not found")),
        },
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      // メッセージフェッチ失敗にかかわらず新パネルがスケジュールされる
      expect(scheduleBumpReminderMock).toHaveBeenCalled();
    });

    it("リマインダーをスケジュールし、成功時に検出ログを記録する", async () => {
      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const sendMock = vi.fn().mockResolvedValue({ id: "panel-1" });
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      expect(scheduleBumpReminderMock).toHaveBeenCalledWith(
        client,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        configService,
        "panel-1",
      );
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.detected"),
      );
    });

    it("パネルが送信不可の場合は panelMessageId に undefined を渡す", async () => {
      const configService = {
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      };
      getBotBumpReminderConfigServiceMock.mockReturnValue(configService);
      scheduleBumpReminderMock.mockResolvedValue(undefined);

      const channel = {
        isTextBased: () => true,
        isSendable: () => false,
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      expect(scheduleBumpReminderMock).toHaveBeenCalledWith(
        client,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
        configService,
        undefined,
      );
    });

    it("scheduleBumpReminder が例外を投げた場合にエラーをそのまま上に出さず、ログだけ残す補償処理を検証", async () => {
      getBotBumpReminderConfigServiceMock.mockReturnValue({
        getBumpReminderConfigOrDefault: vi
          .fn()
          .mockResolvedValue({ enabled: true, mentionUserIds: [] }),
      });
      scheduleBumpReminderMock.mockRejectedValue(new Error("set failed"));

      const sendMock = vi.fn().mockResolvedValue({ id: "panel-1" });
      const channel = {
        isTextBased: () => true,
        isSendable: () => true,
        send: sendMock,
      };
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue(channel),
        },
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };
      getGuildTranslatorMock.mockResolvedValue((key: string) => key);

      await handleBumpDetected(
        client as never,
        "guild-1",
        "ch-1",
        "msg-1",
        "Disboard",
      );

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining("bumpReminder:log.detection_failed"),
        expect.any(Error),
      );
    });
  });
});
