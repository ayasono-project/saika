// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler.test.ts

import { ChannelType, MessageFlags } from "discord.js";

const findByChannelMock = vi.fn();
const updateContentMock = vi.fn();
const updateLastMessageIdMock = vi.fn();
const buildPayloadMock = vi.fn(() => ({ content: "sticky" }));
const tGuildMock = vi.fn(async (_guildId: string, key: string) => `[${key}]`);
const loggerMock = { error: vi.fn() };

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findByChannel: findByChannelMock,
    updateContent: updateContentMock,
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
  createInfoEmbed: vi.fn((msg: string) => ({ type: "info", msg })),
  createSuccessEmbed: vi.fn((msg: string) => ({ type: "success", msg })),
}));

function createInteractionMock({
  guild = true,
  customId = "sticky-message:update-modal:ch-1",
  contentValue = "Updated content",
  channelInCache = true,
  sendResult = { id: "new-msg-id" },
  fetchSuccess = true,
}: {
  guild?: boolean;
  customId?: string;
  contentValue?: string;
  channelInCache?: boolean;
  lastMessageId?: string | undefined;
  sendResult?: unknown;
  fetchSuccess?: boolean;
} = {}) {
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const sendMock = vi.fn().mockResolvedValue(sendResult);
  const deleteMock = vi.fn().mockResolvedValue(undefined);
  const fetchMsgMock = fetchSuccess
    ? vi.fn().mockResolvedValue({ delete: deleteMock })
    : vi.fn().mockRejectedValue(new Error("Not found"));
  const textChannel = channelInCache
    ? {
        type: ChannelType.GuildText,
        messages: { fetch: fetchMsgMock },
        send: sendMock,
      }
    : null;
  return {
    customId,
    reply: replyMock,
    guild: guild
      ? {
          id: "guild-1",
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
    _deleteMock: deleteMock,
    _fetchMsgMock: fetchMsgMock,
  };
}

// モーダル送信時にスティッキーメッセージの内容を更新し、Discord上の投稿を差し替える一連のフローを検証する
describe("bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler", () => {
  // 各テストが独立して動くよう、モックの呼び出し履歴をリセットし updateContent の成功レスポンスを初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    updateContentMock.mockResolvedValue({
      id: "sticky-1",
      content: "Updated content",
    });
    updateLastMessageIdMock.mockResolvedValue(undefined);
  });

  it("UPDATE_MODAL_ID_PREFIX にマッチする customId を正しく識別する", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    expect(
      stickyMessageUpdateModalHandler.matches(
        "sticky-message:update-modal:ch-1",
      ),
    ).toBe(true);
    expect(
      stickyMessageUpdateModalHandler.matches(
        "sticky-message:update-embed-modal:ch-1",
      ),
    ).toBe(false);
  });

  it("guild が null の場合に早期リターンする", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    const interaction = createInteractionMock({ guild: false });

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(interaction._replyMock).not.toHaveBeenCalled();
  });

  it("コンテンツが空の場合に警告を Ephemeral 返信する", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    const interaction = createInteractionMock({ contentValue: "  " });

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(updateContentMock).not.toHaveBeenCalled();
  });

  it("スティッキーメッセージが見つからない場合に情報を Ephemeral 返信する", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(updateContentMock).not.toHaveBeenCalled();
  });

  it("DB更新→旧メッセージ削除→新メッセージ送信という正常系の連鎖フロー全体が正しく実行される", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "old-msg-id",
    });
    const interaction = createInteractionMock();

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(updateContentMock).toHaveBeenCalledWith(
      "sticky-1",
      "Updated content",
      null,
      "user-1",
    );
    expect(interaction._fetchMsgMock).toHaveBeenCalledWith("old-msg-id");
    expect(interaction._deleteMock).toHaveBeenCalled();
    expect(interaction._sendMock).toHaveBeenCalled();
    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("旧メッセージの取得・削除に失敗しても例外を握りつぶして後続処理（返信）が完了する", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "old-msg-id",
    });
    const interaction = createInteractionMock({ fetchSuccess: false });

    await expect(
      stickyMessageUpdateModalHandler.execute(interaction as never),
    ).resolves.not.toThrow();
    expect(interaction._replyMock).toHaveBeenCalled();
  });

  it("DB更新は成功したがDiscordへの再送信が失敗した場合に、エラーがログに記録される", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "old-msg-id",
    });
    const interaction = createInteractionMock({
      sendResult: undefined,
    });
    interaction._sendMock.mockRejectedValue(new Error("Send failed"));

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("stickyMessage:log.resend_after_update_failed"),
      expect.any(Object),
    );
  });

  it("キャッシュにチャンネルがない場合は再送信をスキップする", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "old-msg-id",
    });
    const interaction = createInteractionMock({ channelInCache: false });

    await stickyMessageUpdateModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalled();
  });

  it("updateContent でDBエラーが発生した場合に例外が上位へ伝播し、かつエラーログが記録される", async () => {
    const { stickyMessageUpdateModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: null,
    });
    updateContentMock.mockRejectedValue(new Error("DB error"));
    const interaction = createInteractionMock({ lastMessageId: undefined });

    await expect(
      stickyMessageUpdateModalHandler.execute(interaction as never),
    ).rejects.toThrow("DB error");
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
