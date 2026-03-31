// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler.test.ts

import {
  ChannelType,
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
} from "discord.js";

const findByChannelMock = vi.fn();
const createMock = vi.fn();
const updateLastMessageIdMock = vi.fn();
const buildPayloadMock = vi.fn(() => ({ embeds: [] }));
const parseColorStrMock = vi.fn(() => 0x008969);
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
  () => ({
    buildStickyMessagePayload: buildPayloadMock,
    parseColorStr: parseColorStrMock,
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
  tGuild: tGuildMock,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({ type: "warning", msg })),
  createSuccessEmbed: vi.fn((msg: string) => ({ type: "success", msg })),
}));

function createInteractionMock({
  guild = true,
  customId = "sticky-message:set-embed-modal:ch-1",
  embedTitle = "Title",
  embedDescription = "Description",
  embedColor = "#ff0000",
  channelInCache = true,
  sendResult = { id: "new-msg-id" },
}: {
  guild?: boolean;
  customId?: string;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
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
          id: "guild-1",
          channels: {
            fetch: vi.fn(async (id: string) =>
              id === "ch-1" ? textChannel : null,
            ),
          },
        }
      : null,
    fields: {
      getTextInputValue: vi.fn((fieldId: string) => {
        if (fieldId === "sticky-message:embed-title-modal-input")
          return embedTitle ?? "";
        if (fieldId === "sticky-message:embed-description-modal-input")
          return embedDescription ?? "";
        if (fieldId === "sticky-message:embed-color-modal-input")
          return embedColor ?? "";
        return "";
      }),
    },
    user: { id: "user-1" },
    _replyMock: replyMock,
    _sendMock: sendMock,
  };
}

// Embedスタイルのスティッキーメッセージをモーダルから新規作成する際の入力バリデーション・DB登録・Discord送信フローを検証する
describe("bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler", () => {
  // テスト間でモック状態を完全リセットし、createMockのデフォルト応答を設定して各ケースを独立させる
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "sticky-1" });
    updateLastMessageIdMock.mockResolvedValue(undefined);
    parseColorStrMock.mockReturnValue(0x008969);
  });

  it("SET_EMBED_MODAL_ID_PREFIX にマッチする customId を正しく識別する", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    expect(
      stickyMessageSetEmbedModalHandler.matches(
        "sticky-message:set-embed-modal:ch-1",
      ),
    ).toBe(true);
    expect(
      stickyMessageSetEmbedModalHandler.matches(
        "sticky-message:set-modal:ch-1",
      ),
    ).toBe(false);
  });

  it("guild が null の場合に早期リターンする", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    const interaction = createInteractionMock({ guild: false });

    await stickyMessageSetEmbedModalHandler.execute(interaction as never);

    expect(interaction._replyMock).not.toHaveBeenCalled();
  });

  it("タイトルと説明が両方空の場合に警告を Ephemeral 返信する", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    const interaction = createInteractionMock({
      embedTitle: "",
      embedDescription: "",
    });

    await stickyMessageSetEmbedModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("対象チャンネルにすでにスティッキーメッセージが存在する場合、重複作成を防ぐガード処理が働く", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue({ id: "existing" });
    const interaction = createInteractionMock();

    await stickyMessageSetEmbedModalHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("Discordチャンネルキャッシュに対象チャンネルが存在しない場合、バリデーションエラーが上位へ伝播する", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({ channelInCache: false });

    await expect(
      stickyMessageSetEmbedModalHandler.execute(interaction as never),
    ).rejects.toThrow();
  });

  it("embed スティッキーメッセージを作成して成功返信する", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({
      embedTitle: "My Title",
      embedDescription: "My Description",
    });

    await stickyMessageSetEmbedModalHandler.execute(interaction as never);

    expect(createMock).toHaveBeenCalled();
    expect(interaction._sendMock).toHaveBeenCalled();
    expect(updateLastMessageIdMock).toHaveBeenCalledWith(
      "sticky-1",
      "new-msg-id",
    );
    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("説明文が空の場合、タイトルのみで create が呼ばれる（content フォールバック）", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({
      embedTitle: "Only Title",
      embedDescription: "",
    });

    await stickyMessageSetEmbedModalHandler.execute(interaction as never);

    expect(createMock).toHaveBeenCalledWith(
      "guild-1",
      "ch-1",
      "Only Title",
      expect.any(String),
      "user-1",
    );
  });

  it("channel.send で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);

    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "POST",
      "/channels/ch-1/messages",
      {},
    );
    const interaction = createInteractionMock({
      sendResult: Promise.reject(apiError),
    });

    await expect(
      stickyMessageSetEmbedModalHandler.execute(interaction as never),
    ).rejects.toBe(apiError);
  });

  it("create が失敗した場合にエラーを再スローする", async () => {
    const { stickyMessageSetEmbedModalHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error("DB error"));
    const interaction = createInteractionMock();

    await expect(
      stickyMessageSetEmbedModalHandler.execute(interaction as never),
    ).rejects.toThrow("DB error");
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
