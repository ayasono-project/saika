import { handleBumpReminderSettingsReset } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.reset";

const resetBumpReminderSettingsMock = vi.fn();
const createSuccessEmbedMock = vi.fn(
  (description: string, opts?: { title?: string }) => ({
    description,
    title: opts?.title,
    kind: "success",
  }),
);
const createWarningEmbedMock = vi.fn(
  (description: string, opts?: { title?: string }) => ({
    description,
    title: opts?.title,
    kind: "warning",
  }),
);

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock(
  "@/features/bump-reminder/handlers/usecases/resetBumpReminderSettings",
  () => ({
    resetBumpReminderSettings: (...args: unknown[]) =>
      resetBumpReminderSettingsMock(...args),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string, opts?: { title?: string }) =>
    createSuccessEmbedMock(description, opts),
  createWarningEmbed: (description: string, opts?: { title?: string }) =>
    createWarningEmbedMock(description, opts),
}));

// reset の確認ダイアログと、確認・キャンセル・タイムアウトそれぞれの応答を検証
describe("bumpReminderSettingsCommand.reset", () => {
  // ケースごとに呼び出し記録を消し、リセット処理を成功させる
  beforeEach(() => {
    vi.clearAllMocks();
    resetBumpReminderSettingsMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: [],
    });
  });

  it("確認ダイアログを ephemeral で表示する", async () => {
    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleBumpReminderSettingsReset(interaction as never, "guild-1");

    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        flags: 64,
      }),
    );
    // 確認ダイアログに Warning Embed を使用
    expect(createWarningEmbedMock).toHaveBeenCalled();
  });

  it("confirm ボタンで、ダッシュボードと共通のリセット処理（初期状態への保存と予約・パネルの取り消し）を実行する", async () => {
    let collectHandler: (i: unknown) => Promise<void> = async () => {};

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn((event: string, handler: (i: unknown) => Promise<void>) => {
          if (event === "collect") collectHandler = handler;
        }),
        stop: vi.fn(),
      }),
    });

    const client = { channels: { fetch: vi.fn() } };
    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      client,
      reply: replyMock,
    };

    await handleBumpReminderSettingsReset(interaction as never, "guild-1");

    // confirm ボタン押下をシミュレート
    const updateMock = vi.fn().mockResolvedValue(undefined);
    await collectHandler({
      customId: "bump-reminder:reset-confirm",
      update: updateMock,
    });

    expect(resetBumpReminderSettingsMock).toHaveBeenCalledWith(
      client,
      "guild-1",
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: [],
      }),
    );
  });

  it("cancel ボタンでキャンセルメッセージを表示する", async () => {
    let collectHandler: (i: unknown) => Promise<void> = async () => {};

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn((event: string, handler: (i: unknown) => Promise<void>) => {
          if (event === "collect") collectHandler = handler;
        }),
        stop: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleBumpReminderSettingsReset(interaction as never, "guild-1");

    const updateMock = vi.fn().mockResolvedValue(undefined);
    await collectHandler({
      customId: "bump-reminder:reset-cancel",
      update: updateMock,
    });

    expect(resetBumpReminderSettingsMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: [],
      }),
    );
  });

  it("タイムアウト時にキャンセルメッセージを表示する", async () => {
    let endHandler: (collected: unknown, reason: string) => Promise<void> =
      async () => {};

    const editReplyMock = vi.fn().mockResolvedValue(undefined);
    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn(
          (
            event: string,
            handler: (collected: unknown, reason: string) => Promise<void>,
          ) => {
            if (event === "end") endHandler = handler;
          },
        ),
        stop: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleBumpReminderSettingsReset(interaction as never, "guild-1");

    await endHandler(undefined, "time");

    expect(editReplyMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array), components: [] }),
    );
  });
});
