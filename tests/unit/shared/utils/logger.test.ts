// tests/unit/shared/utils/logger.test.ts
// NODE_ENV と LOG_LEVEL の組み合わせに応じてトランスポート構成・ログレベル・
// フォーマット関数の出力が正しく切り替わるかを検証する。
// DISCORD_ERROR_WEBHOOK_URL 設定時の DiscordWebhookTransport 追加も確認する
describe("Logger", () => {
  // グローバルsetupのloggerモックを解除し、doMock で独自に差し替える
  vi.doUnmock("@/shared/utils/logger");

  const loadLoggerModule = async (
    nodeEnv: "development" | "production" | "test",
    logLevel?: string,
    webhookUrl?: string,
  ) => {
    vi.resetModules();

    const consoleTransportMock = vi.fn();
    const dailyRotateMock = vi.fn();
    const createLoggerMock = vi.fn((options) => ({ ...options }));
    const discordWebhookTransportMock = vi.fn();

    const winstonMock = {
      createLogger: createLoggerMock,
      format: {
        combine: vi.fn((...parts) => ({ type: "combine", parts })),
        timestamp: vi.fn((opts) => ({ type: "timestamp", opts })),
        printf: vi.fn((fn) => ({ type: "printf", fn })),
        colorize: vi.fn(() => ({ type: "colorize" })),
      },
      transports: {
        Console: consoleTransportMock,
      },
      Transport: class {},
    };

    vi.doMock("winston", () => ({ __esModule: true, default: winstonMock }));
    vi.doMock("winston-daily-rotate-file", () => ({
      __esModule: true,
      default: dailyRotateMock,
    }));
    vi.doMock("@/shared/utils/discordWebhookTransport", () => ({
      DiscordWebhookTransport: discordWebhookTransportMock,
    }));
    vi.doMock("@/shared/config/env", () => ({
      NODE_ENV: {
        DEVELOPMENT: "development",
        PRODUCTION: "production",
        TEST: "test",
      },
      env: {
        NODE_ENV: nodeEnv,
        LOG_LEVEL: logLevel,
        DISCORD_ERROR_WEBHOOK_URL: webhookUrl,
      },
    }));

    const module = await import("@/shared/utils/logger");
    return {
      module,
      winstonMock,
      createLoggerMock,
      consoleTransportMock,
      dailyRotateMock,
      discordWebhookTransportMock,
    };
  };

  it("development 環境では Console + DailyRotateFile×2 の計3トランスポートと debug レベルが設定されること", async () => {
    const { module, createLoggerMock, consoleTransportMock, dailyRotateMock } =
      await loadLoggerModule("development", "debug");

    expect(module.logger).toBeDefined();
    expect(dailyRotateMock).toHaveBeenCalledTimes(2);
    expect(consoleTransportMock).toHaveBeenCalledTimes(1);
    expect(consoleTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug" }),
    );

    const createLoggerArgs = createLoggerMock.mock.calls[0][0];
    expect(createLoggerArgs.level).toBe("debug");
    expect(createLoggerArgs.exitOnError).toBe(false);
    expect(createLoggerArgs.transports).toHaveLength(3);
  });

  it("非 development 環境では info レベルのコンソールトランスポートとデフォルト設定が適用されること", async () => {
    const { createLoggerMock, consoleTransportMock, dailyRotateMock } =
      await loadLoggerModule("production", undefined);

    expect(dailyRotateMock).toHaveBeenCalledTimes(2);
    expect(consoleTransportMock).toHaveBeenCalledTimes(1);
    expect(consoleTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: "info" }),
    );

    const createLoggerArgs = createLoggerMock.mock.calls[0][0];
    expect(createLoggerArgs.level).toBe("info");
    expect(createLoggerArgs.transports).toHaveLength(3);
  });

  // コンソール用 printf が stack の有無でフォーマットを切り替えること、
  // stack がある場合は改行で続けて出力されることを検証する
  it("development 環境でコンソール出力が stack の有無でフォーマットを切り替えること", async () => {
    const { winstonMock } = await loadLoggerModule("development", "debug");

    const printfCalls = winstonMock.format.printf.mock.calls;
    const consolePrintf = printfCalls[1]?.[0] as
      | ((entry: {
          timestamp: string;
          level: string;
          message: string;
          stack?: string;
        }) => string)
      | undefined;

    expect(consolePrintf).toBeDefined();
    expect(
      consolePrintf?.({
        timestamp: "2026-02-21 00:00:00",
        level: "info",
        message: "hello",
      }),
    ).toBe("2026-02-21 00:00:00 [info]: hello");
    expect(
      consolePrintf?.({
        timestamp: "2026-02-21 00:00:00",
        level: "error",
        message: "boom",
        stack: "STACK_TRACE",
      }),
    ).toBe("2026-02-21 00:00:00 [error]: boom\nSTACK_TRACE");
  });

  // ファイル用 printf が余剰メタフィールドを JSON 文字列として末尾に付加し、
  // stack は改行区切りで最後に出力されることを確認する
  it("ファイル出力がメタフィールドと stack を正しくフォーマットすること", async () => {
    const { winstonMock } = await loadLoggerModule("development", "debug");

    const printfCalls = winstonMock.format.printf.mock.calls;
    const filePrintf = printfCalls[0]?.[0] as
      | ((entry: {
          timestamp: string;
          level: string;
          message: string;
          stack?: string;
          [key: string]: unknown;
        }) => string)
      | undefined;

    expect(
      filePrintf?.({
        timestamp: "2026-02-21 00:00:00",
        level: "info",
        message: "hello",
      }),
    ).toBe("2026-02-21 00:00:00 [INFO]: hello");
    expect(
      filePrintf?.({
        timestamp: "2026-02-21 00:00:00",
        level: "error",
        message: "boom",
        stack: "STACK_TRACE",
        guildId: "g1",
      }),
    ).toBe('2026-02-21 00:00:00 [ERROR]: boom{"guildId":"g1"}\nSTACK_TRACE');
  });

  it("LOG_LEVEL が未設定の開発環境ではデフォルト値として debug が適用されること", async () => {
    const { consoleTransportMock } = await loadLoggerModule(
      "development",
      undefined,
    );

    expect(consoleTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug" }),
    );
  });

  it("DISCORD_ERROR_WEBHOOK_URL が設定されている場合に DiscordWebhookTransport が追加されて4トランスポートになること", async () => {
    const { createLoggerMock, discordWebhookTransportMock } =
      await loadLoggerModule(
        "production",
        undefined,
        "https://discord.com/api/webhooks/123/token",
      );

    expect(discordWebhookTransportMock).toHaveBeenCalledTimes(1);
    expect(discordWebhookTransportMock).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/123/token",
    );
    const createLoggerArgs = createLoggerMock.mock.calls[0][0];
    expect(createLoggerArgs.transports).toHaveLength(4);
  });

  it("DISCORD_ERROR_WEBHOOK_URL が未設定の場合は DiscordWebhookTransport が追加されないこと", async () => {
    const { createLoggerMock, discordWebhookTransportMock } =
      await loadLoggerModule("production", undefined);

    expect(discordWebhookTransportMock).not.toHaveBeenCalled();
    const createLoggerArgs = createLoggerMock.mock.calls[0][0];
    expect(createLoggerArgs.transports).toHaveLength(3);
  });
});
