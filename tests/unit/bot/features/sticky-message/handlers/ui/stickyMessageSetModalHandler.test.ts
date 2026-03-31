// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler.test.ts

import { ChannelType, MessageFlags } from "discord.js";

const findByChannelMock = vi.fn();
const createMock = vi.fn();
const updateLastMessageIdMock = vi.fn();
const buildPayloadMock = vi.fn(() => ({ content: "sticky" }));
const tGuildMock = vi.fn(async (_guildId: string, key: string) => `[${key}]`);
const loggerMock = { error: vi.fn() };

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findByChannel: findByChannelMock,
    create: createMock,
    updateLastMessageId: updateLastMessageIdMock,
  })),
}));
vi.mock(
  "@/bot/features/sticky-message/services/stickyMessagePayloadBuilder",
  () => ({ buildStickyMessagePayload: buildPayloadMock }),
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
  tGuild: tGuildMock,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({ type: "warning", msg })),
  createSuccessEmbed: vi.fn((msg: string, opts?: unknown) => ({
    type: "success",
    msg,
    ...(opts as object),
  })),
}));

function createInteractionMock({
  guildId = "guild-1",
  guild = true,
  customId = "sticky-message:set-modal:ch-1",
  contentValue = "Some content",
  channelInCache = true,
  sendResult = { id: "new-msg-id" },
}: {
  guildId?: string;
  guild?: boolean;
  customId?: string;
  contentValue?: string;
  channelInCache?: boolean;
  sendResult?: unknown;
} = {}) {
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const sendMock = vi.fn().mockResolvedValue(sendResult);
  const textChannel = channelInCache
    ? { type: ChannelType.GuildText, send: sendMock }
    : null;
  return {
    customId,
    reply: replyMock,
    guild: guild
      ? {
          id: guildId,
          channels: {
            fetch: vi.fn(async (id: string) =>
              id === "ch-1" ? textChannel : null,
            ),
          },
        }
      : null,
    fields: { getTextInputValue: vi.fn(() => contentValue) },
    user: { id: "user-1" },
    _replyMock: replyMock,
    _sendMock: sendMock,
  };
}

// モーダル送信後のスティッキーメッセージ作成フロー全体（バリデーション・DB操作・Discord送信）を検証するグループ
describe("bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler", () => {
  // 各テストが独立した状態で実行できるよう、モックの呼び出し履歴とデフォルト戻り値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "sticky-1" });
    updateLastMessageIdMock.mockResolvedValue(undefined);
  });

  it("SET_MODAL_ID_PREFIX にマッチする customId を正しく識別する", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    expect(
      stickyMessageSetModalHandler.matches("sticky-message:set-modal:ch-abc"),
    ).toBe(true);
    expect(
      stickyMessageSetModalHandler.matches(
        "sticky-message:set-embed-modal:ch-abc",
      ),
    ).toBe(false);
    expect(stickyMessageSetModalHandler.matches("other-custom-id")).toBe(false);
  });

  it("guild が null の場合に早期リターンする", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    const interaction = createInteractionMock({ guild: false });

    await stickyMessageSetModalHandler.execute(interaction as never);

    expect(interaction._replyMock).not.toHaveBeenCalled();
  });

  it("コンテンツが空の場合に警告を Ephemeral 返信する", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    const interaction = createInteractionMock({ contentValue: "   " });

    await stickyMessageSetModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("モーダル提出と同時に別のリクエストがスティッキーを作成していた場合（レースコンディション）に警告を返す", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    findByChannelMock.mockResolvedValue({ id: "existing" });
    const interaction = createInteractionMock();

    await stickyMessageSetModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("チャンネルキャッシュに存在しないチャンネルIDがcustomIdに含まれている場合、処理を続行せずに例外を投げる", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({ channelInCache: false });

    await expect(
      stickyMessageSetModalHandler.execute(interaction as never),
    ).rejects.toThrow();
  });

  it("スティッキーメッセージを作成して成功返信する", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({ contentValue: "Hello World" });

    await stickyMessageSetModalHandler.execute(interaction as never);

    expect(createMock).toHaveBeenCalledWith(
      "guild-1",
      "ch-1",
      "Hello World",
      undefined,
      "user-1",
    );
    expect(interaction._sendMock).toHaveBeenCalled();
    expect(updateLastMessageIdMock).toHaveBeenCalledWith(
      "sticky-1",
      "new-msg-id",
    );
    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("DB作成処理が失敗した場合にエラーが呼び出し元へ再スローされ、かつエラーログが記録される", async () => {
    const { stickyMessageSetModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error("DB error"));
    const interaction = createInteractionMock();

    await expect(
      stickyMessageSetModalHandler.execute(interaction as never),
    ).rejects.toThrow("DB error");
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
