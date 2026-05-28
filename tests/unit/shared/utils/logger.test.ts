// tests/unit/shared/utils/logger.test.ts
// saika の logger.ts が @ayasono/shared/core の createLogger / DiscordWebhookTransport を
// env に基づいて正しく wiring することを検証する。
// NOTE: フォーマット/トランスポート構成ロジック本体は @ayasono/shared 側の責務（shared 側でテストする）。
describe("Logger", () => {
  // グローバルsetupのloggerモックを解除し、doMock で独自に差し替える
  vi.doUnmock("@/shared/utils/logger");

  const loadLoggerModule = async (
    nodeEnv: "development" | "production" | "test",
    logLevel?: string,
    webhookUrl?: string,
  ) => {
    vi.resetModules();

    const createLoggerMock = vi.fn((options) => ({ ...options }));
    const discordWebhookTransportMock = vi.fn();

    vi.doMock("@ayasono/shared/core", () => ({
      createLogger: createLoggerMock,
      DiscordWebhookTransport: discordWebhookTransportMock,
    }));
    vi.doMock("i18next", () => ({
      default: {
        t: vi.fn((key: string, opts?: Record<string, unknown>) =>
          key === "system:discord.error_notification_title"
            ? `🚨 ${String(opts?.appName ?? "")} エラー通知`
            : key,
        ),
      },
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
    return { module, createLoggerMock, discordWebhookTransportMock };
  };

  it("development 環境では isDevelopment=true・指定 logLevel で createLogger が呼ばれること", async () => {
    const { module, createLoggerMock } = await loadLoggerModule(
      "development",
      "debug",
    );

    expect(module.logger).toBeDefined();
    expect(createLoggerMock).toHaveBeenCalledTimes(1);
    const args = createLoggerMock.mock.calls[0][0];
    expect(args.isDevelopment).toBe(true);
    expect(args.logLevel).toBe("debug");
  });

  it("非 development 環境では isDevelopment=false で createLogger が呼ばれること", async () => {
    const { createLoggerMock } = await loadLoggerModule(
      "production",
      undefined,
    );

    const args = createLoggerMock.mock.calls[0][0];
    expect(args.isDevelopment).toBe(false);
    expect(args.logLevel).toBeUndefined();
  });

  it("DISCORD_ERROR_WEBHOOK_URL 設定時に DiscordWebhookTransport が URL と getTitle で生成され extraTransports に渡されること", async () => {
    const { createLoggerMock, discordWebhookTransportMock } =
      await loadLoggerModule(
        "production",
        undefined,
        "https://discord.com/api/webhooks/123/token",
      );

    expect(discordWebhookTransportMock).toHaveBeenCalledTimes(1);
    expect(discordWebhookTransportMock).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/123/token",
      expect.objectContaining({ getTitle: expect.any(Function) }),
    );
    const args = createLoggerMock.mock.calls[0][0];
    expect(args.extraTransports).toHaveLength(1);
  });

  it("DISCORD_ERROR_WEBHOOK_URL 未設定時は DiscordWebhookTransport が生成されず extraTransports が空になること", async () => {
    const { createLoggerMock, discordWebhookTransportMock } =
      await loadLoggerModule("production", undefined);

    expect(discordWebhookTransportMock).not.toHaveBeenCalled();
    const args = createLoggerMock.mock.calls[0][0];
    expect(args.extraTransports).toHaveLength(0);
  });

  it("getTitle が i18n タイトルキーを appName 付きで解決すること", async () => {
    const { discordWebhookTransportMock } = await loadLoggerModule(
      "production",
      undefined,
      "https://discord.com/api/webhooks/123/token",
    );

    const options = discordWebhookTransportMock.mock.calls[0][1] as {
      getTitle: () => string;
    };
    expect(options.getTitle()).toContain("エラー通知");
  });
});
