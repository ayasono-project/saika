// tests/unit/bot/features/sticky-message/handlers/stickyMessageCreateHandler.test.ts

import { ChannelType } from "discord.js";

const handleMessageCreateMock = vi.fn();
const loggerMock = { error: vi.fn() };

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageResendService: vi.fn(() => ({
    handleMessageCreate: handleMessageCreateMock,
  })),
}));

vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));
vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  tDefault: vi.fn((key: string) => key),
  tInteraction: vi.fn((_locale: string, key: string) => key),
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
}));

function createMessageMock(
  overrides: Partial<{
    author: { bot: boolean };
    guildId: string | null;
    channelId: string;
    channel: { type: ChannelType };
  }> = {},
) {
  return {
    author: { bot: false },
    guildId: "guild-1",
    guild: { id: "guild-1" },
    channelId: "channel-1",
    channel: { type: ChannelType.GuildText },
    ...overrides,
  };
}

// メッセージ作成イベントハンドラーが
// Bot メッセージ・DM・非テキストチャンネルを正しくフィルタリングし、
// 有効なメッセージのみスティッキーメッセージの再送サービスに委譲するかを検証する
describe("bot/features/sticky-message/handlers/stickyMessageCreateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ギルドテキストチャンネルのメッセージに対して再送サービスを呼び出す", async () => {
    const { handleStickyMessageCreate } = await import(
      "@/bot/features/sticky-message/handlers/stickyMessageCreate" + "Handler"
    );
    const message = createMessageMock();

    await handleStickyMessageCreate(message as never);

    expect(handleMessageCreateMock).toHaveBeenCalledWith(
      message.channel,
      "guild-1",
    );
  });

  it("Bot からのメッセージは無視する", async () => {
    const { handleStickyMessageCreate } = await import(
      "@/bot/features/sticky-message/handlers/stickyMessageCreateHandler"
    );
    const message = createMessageMock({ author: { bot: true } });

    await handleStickyMessageCreate(message as never);

    expect(handleMessageCreateMock).not.toHaveBeenCalled();
  });

  it("DM（guildId が null）はギルドスコープの機能対象外のため無視される", async () => {
    const { handleStickyMessageCreate } = await import(
      "@/bot/features/sticky-message/handlers/stickyMessageCreateHandler"
    );
    const message = createMessageMock({ guildId: null });

    await handleStickyMessageCreate(message as never);

    expect(handleMessageCreateMock).not.toHaveBeenCalled();
  });

  it("テキスト以外のチャンネルのメッセージは無視する", async () => {
    const { handleStickyMessageCreate } = await import(
      "@/bot/features/sticky-message/handlers/stickyMessageCreateHandler"
    );
    const message = createMessageMock({
      channel: { type: ChannelType.GuildVoice },
    });

    await handleStickyMessageCreate(message as never);

    expect(handleMessageCreateMock).not.toHaveBeenCalled();
  });

  it("再送サービスが例外を投げても呼び出し元に伝播させずエラーログのみ記録する", async () => {
    const { handleStickyMessageCreate } = await import(
      "@/bot/features/sticky-message/handlers/stickyMessageCreateHandler"
    );
    handleMessageCreateMock.mockRejectedValueOnce(new Error("resend error"));
    const message = createMessageMock();

    await handleStickyMessageCreate(message as never);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("stickyMessage:log.create_handler_error"),
      expect.objectContaining({ channelId: "channel-1" }),
    );
  });
});
