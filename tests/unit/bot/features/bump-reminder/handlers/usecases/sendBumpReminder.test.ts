// tests/unit/bot/features/bump-reminder/handlers/usecases/sendBumpReminder.test.ts
// チャンネル状態・設定状態・サービス種別(Disboard/Dissoku)・パネルメッセージの有無など
// 多様な条件下でリマインダー送信ユースケースが正しく動作することを検証するテスト群
describe("bot/features/bump-reminder/handlers/usecases/sendBumpReminder", () => {
  const tDefaultMock = vi.fn((key: string) => key);
  const loggerMock = {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };
  const getGuildTranslatorMock = vi.fn();
  const tGuildMock = vi.fn((key: string) => key);

  // vi.doMock を使う都合上、各テストでモジュールキャッシュをリセットして
  // 新しいモック定義が確実に適用された状態でインポートできるようにする
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getGuildTranslatorMock.mockResolvedValue(tGuildMock);

    vi.doMock("@/shared/utils/logger", () => ({ logger: loggerMock }));
    vi.doMock("@/shared/locale/localeManager", () => ({
      logPrefixed: (
        prefixKey: string,
        messageKey: string,
        params?: Record<string, unknown>,
        sub?: string,
      ) => {
        const p = `${prefixKey}`;
        const m = params
          ? `${messageKey}:${JSON.stringify(params)}`
          : messageKey;
        return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
      },
      logCommand: (
        commandName: string,
        messageKey: string,
        params?: Record<string, unknown>,
      ) => {
        const m = params
          ? `${messageKey}:${JSON.stringify(params)}`
          : messageKey;
        return `[${commandName}] ${m}`;
      },
      tDefault: tDefaultMock,
    }));
    vi.doMock("@/shared/locale/helpers", () => ({
      getGuildTranslator: getGuildTranslatorMock,
    }));
    vi.doMock("@/bot/shared/errorChannelNotifier", () => ({
      notifyErrorChannel: vi.fn(),
      notifyWarnChannel: vi.fn(),
    }));
  });

  function makeChannel({
    isTextBased = true,
    isSendable = true,
    sendResult = undefined as unknown,
    messagesFetch = vi.fn().mockResolvedValue({ delete: vi.fn() }),
  } = {}) {
    return {
      isTextBased: vi.fn(() => isTextBased),
      isSendable: vi.fn(() => isSendable),
      send: vi.fn().mockResolvedValue(sendResult),
      messages: { fetch: messagesFetch },
    };
  }

  function makeClient(channel: ReturnType<typeof makeChannel> | null = null) {
    return {
      channels: {
        fetch: vi.fn().mockResolvedValue(channel),
      },
      guilds: {
        cache: new Map([["guild-1", { id: "guild-1" }]]),
      },
    };
  }

  function makeConfigService(config: unknown = { enabled: true }) {
    return {
      getBumpReminderConfigOrDefault: vi.fn().mockResolvedValue(config),
    };
  }

  it("sendBumpReminder 関数がエクスポートされていることを確認する", async () => {
    const module = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );

    expect(typeof module.sendBumpReminder).toBe("function");
  });

  it("チャンネルがテキストベースでない場合は警告ログを出して返す", async () => {
    const channel = makeChannel({ isTextBased: false });
    const client = makeClient(channel);
    const service = makeConfigService();

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      undefined,
      service as never,
    );

    expect(loggerMock.warn).toHaveBeenCalled();
    expect(service.getBumpReminderConfigOrDefault).not.toHaveBeenCalled();
  });

  it("設定が無効の場合はデバッグログを出して返す", async () => {
    const channel = makeChannel();
    const client = makeClient(channel);
    const service = makeConfigService({ enabled: false });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      undefined,
      service as never,
    );

    expect(loggerMock.debug).toHaveBeenCalled();
    expect(channel.send).not.toHaveBeenCalled();
  });

  it("Disboard は bump 元メッセージへのリプライ形式で通知するため messageId が提供された場合に reply フィールドが含まれることを確認", async () => {
    const channel = makeChannel();
    const client = makeClient(channel);
    const service = makeConfigService({
      enabled: true,
      mentionRoleId: null,
      mentionUserIds: [],
    });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      "msg-1",
      "Disboard",
      service as never,
    );

    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({ reply: { messageReference: "msg-1" } }),
    );
    expect(loggerMock.info).toHaveBeenCalled();
  });

  it("Dissoku は messageId なしでリプライなしのプレーンメッセージを送信する", async () => {
    const channel = makeChannel();
    const client = makeClient(channel);
    const service = makeConfigService({
      enabled: true,
      mentionRoleId: null,
      mentionUserIds: [],
    });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      "Dissoku",
      service as never,
    );

    expect(channel.send).toHaveBeenCalledWith(expect.any(String));
    expect(loggerMock.info).toHaveBeenCalled();
  });

  it("serviceName が undefined の場合は汎用リマインダーメッセージを送信する", async () => {
    const channel = makeChannel();
    const client = makeClient(channel);
    const service = makeConfigService({
      enabled: true,
      mentionRoleId: null,
      mentionUserIds: [],
    });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      undefined,
      service as never,
    );

    expect(channel.send).toHaveBeenCalled();
  });

  it("ロールメンションと複数ユーザーメンションが Discord の書式（<@&...>, <@...>）で本文に含まれることを確認", async () => {
    const channel = makeChannel();
    const client = makeClient(channel);
    const service = makeConfigService({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1", "user-2"],
    });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      "Disboard",
      service as never,
    );

    const sentContent = channel.send.mock.calls[0][0] as string;
    expect(sentContent).toContain("<@&role-1>");
    expect(sentContent).toContain("<@user-1>");
    expect(sentContent).toContain("<@user-2>");
  });

  it("チャンネルフェッチが例外を投げた場合はエラーログを記録する", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const client = {
      channels: { fetch: fetchMock },
      guilds: { cache: new Map([["guild-1", { id: "guild-1" }]]) },
    };
    const service = makeConfigService({ enabled: true });

    const { sendBumpReminder } = await import(
      "@/bot/features/bump-reminder/handlers/usecases/sendBumpReminder"
    );
    await sendBumpReminder(
      client as never,
      "guild-1",
      "ch-1",
      undefined,
      "Disboard",
      service as never,
    );

    expect(loggerMock.error).toHaveBeenCalled();
  });
});
