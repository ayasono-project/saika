// tests/unit/bot/features/sticky-message/commands/usecases/stickyMessageUpdate.test.ts

import { ChannelType, MessageFlags } from "discord.js";

const findByChannelMock = vi.fn();
const showModalMock = vi.fn().mockResolvedValue(undefined);
const tGuildMock = vi.fn(async (_guildId: string, key: string) => `[${key}]`);
const tDefaultMock = vi.fn((_key: string) => "mock text");

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findByChannel: findByChannelMock,
  })),
}));
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
  tDefault: tDefaultMock,
  tInteraction: (_locale: string, _key: string) => "mock text",
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({
    type: "warning",
    description: msg,
  })),
  createInfoEmbed: vi.fn((msg: string, opts?: unknown) => ({
    type: "info",
    description: msg,
    ...(opts as object),
  })),
}));

function createInteractionMock({
  channelType = ChannelType.GuildText,
  channelFromOption = null as { id: string; type: ChannelType } | null,
  useEmbed = false,
} = {}) {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    showModal: showModalMock,
    channel: { id: "current-ch", type: channelType },
    options: {
      getChannel: vi.fn(() => channelFromOption),
      getString: vi.fn(() => (useEmbed ? "embed" : null)),
    },
  };
}

// チャンネル種別・StickyMessage の存在有無・埋め込みオプションの組み合わせに応じて
// モーダル表示またはエフェメラル警告返信が正しく行われるかを検証する
describe("bot/features/sticky-message/commands/usecases/stickyMessageUpdate", () => {
  // 各テスト間でモック呼び出し履歴が混在しないようリセットし、showModal の戻り値も初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    showModalMock.mockResolvedValue(undefined);
  });

  it("チャンネルが GuildText でない場合に警告を Ephemeral 返信する", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    const interaction = createInteractionMock({
      channelType: ChannelType.GuildVoice,
    });

    await handleStickyMessageUpdate(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(findByChannelMock).not.toHaveBeenCalled();
  });

  it("スティッキーメッセージが見つからない場合に情報を Ephemeral 返信する", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleStickyMessageUpdate(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(showModalMock).not.toHaveBeenCalled();
  });

  it("embed オプションが false のとき、テキスト編集用モーダル（update-modal）を表示する", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      content: "Original content",
      embedData: null,
    });
    const interaction = createInteractionMock({ useEmbed: false });

    await handleStickyMessageUpdate(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    expect(modal.data.custom_id).toContain("sticky-message:update-modal:");
  });

  it("embedData が存在し useEmbed=true の場合、埋め込み編集専用モーダル（update-embed-modal）を表示する", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      content: "Content",
      embedData: JSON.stringify({
        title: "T",
        description: "D",
        color: 0xff0000,
      }),
    });
    const interaction = createInteractionMock({ useEmbed: true });

    await handleStickyMessageUpdate(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    expect(modal.data.custom_id).toContain(
      "sticky-message:update-embed-modal:",
    );
  });

  it("embedData が null でも embed=true が指定された場合、空の初期値でモーダルが表示される", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      content: "Content",
      embedData: null,
    });
    const interaction = createInteractionMock({ useEmbed: true });

    await handleStickyMessageUpdate(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
  });

  it("getString が null を返す場合（style 未指定）にデフォルトで text スタイルとなり、プレーンテキストモーダルが開かれる", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      content: "Original content",
      embedData: null,
    });
    const interaction = {
      reply: vi.fn().mockResolvedValue(undefined),
      showModal: showModalMock,
      channel: { id: "current-ch", type: ChannelType.GuildText },
      options: {
        getChannel: vi.fn(() => null),
        getString: vi.fn(() => null),
      },
    };

    await handleStickyMessageUpdate(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    expect(modal.data.custom_id).toContain("sticky-message:update-modal:");
  });

  it("テキスト以外のチャンネルオプションが指定された場合に警告を返信する", async () => {
    const { handleStickyMessageUpdate } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate"
    );
    const interaction = createInteractionMock({
      channelFromOption: { id: "voice-ch", type: ChannelType.GuildVoice },
    });

    await handleStickyMessageUpdate(interaction as never);

    expect(interaction.reply).toHaveBeenCalled();
  });
});
