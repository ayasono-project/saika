// Bumpリマインダー定数の整合性と検知ロジックの純粋関数を検証
describe("shared/features/bump-reminder/constants", () => {
  // TEST_MODE の切り替えを確実に反映させるため、モジュールを都度再読込する
  async function loadModule(testMode: boolean) {
    vi.resetModules();
    vi.doMock("@/shared/config/env", () => ({
      NODE_ENV: {
        DEVELOPMENT: "development",
        PRODUCTION: "production",
        TEST: "test",
      },
      env: {
        NODE_ENV: "test",
        LOG_LEVEL: "info",
        TEST_MODE: testMode,
      },
    }));

    return import(
      "@/bot/features/bump-reminder/constants/bumpReminderConstants"
    );
  }

  // モジュールキャッシュとタイマー副作用を各ケースでリセットする
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("定数値が仕様どおり固定されていることを検証", async () => {
    const mod = await loadModule(false);

    expect(mod.BUMP_CONSTANTS.DISBOARD_BOT_ID).toBe("302050872383242240");
    expect(mod.BUMP_CONSTANTS.DISSOKU_BOT_ID).toBe("761562078095867916");
    expect(mod.BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_ON).toBe(
      "bump-reminder:mention-on:",
    );
    expect(mod.BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_OFF).toBe(
      "bump-reminder:mention-off:",
    );
    expect(mod.BUMP_CONSTANTS.JOB_ID_PREFIX).toBe("bump-reminder-");
  });

  it("検知ルールが Bot ID / command / service の対応表と一致することを検証", async () => {
    const mod = await loadModule(false);

    expect(mod.BUMP_DETECTION_RULES).toEqual([
      {
        botId: mod.BUMP_CONSTANTS.DISBOARD_BOT_ID,
        commandName: mod.BUMP_COMMANDS.DISBOARD,
        serviceName: mod.BUMP_SERVICES.DISBOARD,
      },
      {
        botId: mod.BUMP_CONSTANTS.DISSOKU_BOT_ID,
        commandName: mod.BUMP_COMMANDS.DISSOKU,
        serviceName: mod.BUMP_SERVICES.DISSOKU,
      },
    ]);
  });

  it("テストモード時は短縮遅延（1分）を返すことを検証", async () => {
    const mod = await loadModule(true);

    expect(mod.getReminderDelayMinutes()).toBe(1);
  });

  it("通常モード時は本番遅延（120分）を返すことを検証", async () => {
    const mod = await loadModule(false);

    expect(mod.getReminderDelayMinutes()).toBe(120);
  });

  it("現在時刻基準で分遅延を予定時刻へ変換できることを検証", async () => {
    const mod = await loadModule(false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-20T00:00:00.000Z"));

    const scheduledAt = mod.toScheduledAt(30);

    expect(scheduledAt.toISOString()).toBe("2026-02-20T00:30:00.000Z");
  });

  it("サービス名判定が大小文字や未知値を正しく弾くことを検証", async () => {
    const mod = await loadModule(false);

    expect(mod.isBumpServiceName("Disboard")).toBe(true);
    expect(mod.isBumpServiceName("Dissoku")).toBe(true);
    expect(mod.isBumpServiceName("disboard")).toBe(false);
    expect(mod.isBumpServiceName("unknown")).toBe(false);
  });

  it("Bot ID とコマンド名の組で正しいサービス名を解決できることを検証", async () => {
    const mod = await loadModule(false);

    expect(
      mod.resolveBumpService(
        mod.BUMP_CONSTANTS.DISBOARD_BOT_ID,
        mod.BUMP_COMMANDS.DISBOARD,
      ),
    ).toBe(mod.BUMP_SERVICES.DISBOARD);

    expect(
      mod.resolveBumpService(
        mod.BUMP_CONSTANTS.DISSOKU_BOT_ID,
        mod.BUMP_COMMANDS.DISSOKU,
      ),
    ).toBe(mod.BUMP_SERVICES.DISSOKU);
  });

  it("ルール未一致時は undefined を返すことを検証", async () => {
    const mod = await loadModule(false);

    expect(
      mod.resolveBumpService(mod.BUMP_CONSTANTS.DISBOARD_BOT_ID, "up"),
    ).toBeUndefined();
    expect(
      mod.resolveBumpService("000000000000000000", mod.BUMP_COMMANDS.DISBOARD),
    ).toBeUndefined();
  });

  it("ジョブID接頭辞と guildId の結合フォーマットを検証", async () => {
    const mod = await loadModule(false);

    expect(mod.toBumpReminderJobId("guild-123")).toBe(
      "bump-reminder-guild-123",
    );
  });

  it("serviceName 付きでジョブID を組み立てられることを検証", async () => {
    const mod = await loadModule(false);

    expect(
      mod.toBumpReminderJobId("guild-123", mod.BUMP_SERVICES.DISBOARD),
    ).toBe("bump-reminder-guild-123:Disboard");
  });
});
