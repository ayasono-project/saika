import { ChannelType, MessageFlags } from "discord.js";
import { COMMON_I18N_KEYS } from "@/bot/shared/i18nKeys";

const findByChannelMock = vi.fn();
const showModalMock = vi.fn().mockResolvedValue(undefined);
const tInteractionMock = vi.fn((_locale: string, _key: string) => "mock text");

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageSettingsService: vi.fn(() => ({
    findByChannel: findByChannelMock,
  })),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (locale: string, key: string) => tInteractionMock(locale, key),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({
    type: "warning",
    description: msg,
  })),
}));

function createInteractionMock({
  channelType = ChannelType.GuildText,
  channelFromOption = null as { id: string; type: ChannelType } | null,
  useEmbed = false,
  replyMock = vi.fn().mockResolvedValue(undefined),
}: {
  channelType?: ChannelType;
  channelFromOption?: { id: string; type: ChannelType } | null;
  useEmbed?: boolean;
  replyMock?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    locale: "ja",
    reply: replyMock,
    showModal: showModalMock,
    channel: { id: "current-ch", type: channelType },
    options: {
      getChannel: vi.fn(
        (_name: string, _required: boolean) => channelFromOption,
      ),
      getString: vi.fn((_name: string) => (useEmbed ? "embed" : null)),
    },
    _replyMock: replyMock,
  };
}

describe("bot/features/sticky-message/commands/usecases/stickyMessageSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showModalMock.mockResolvedValue(undefined);
  });

  it("チャンネルが GuildText でない場合に警告を Ephemeral 返信する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    const interaction = createInteractionMock({
      channelType: ChannelType.GuildVoice,
    });

    await handleStickyMessageSet(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(tInteractionMock).toHaveBeenCalledWith(
      "ja",
      COMMON_I18N_KEYS.TEXT_CHANNEL_ONLY,
    );
    expect(findByChannelMock).not.toHaveBeenCalled();
  });

  it("テキスト以外のチャンネルオプションを指定した場合に警告を Ephemeral 返信する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    const interaction = createInteractionMock({
      channelFromOption: { id: "voice-ch", type: ChannelType.GuildVoice },
    });

    await handleStickyMessageSet(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(tInteractionMock).toHaveBeenCalledWith(
      "ja",
      COMMON_I18N_KEYS.TEXT_CHANNEL_ONLY,
    );
  });

  it("スティッキーメッセージがすでに存在する場合に警告を Ephemeral 返信する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    findByChannelMock.mockResolvedValue({ id: "existing" });
    const interaction = createInteractionMock();

    await handleStickyMessageSet(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(showModalMock).not.toHaveBeenCalled();
  });

  it("embed が false の場合にプレーンテキストモーダルを表示する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({ useEmbed: false });

    await handleStickyMessageSet(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    // Check that modal uses SET_MODAL_ID_PREFIX
    expect(modal.data.custom_id).toContain("sticky-message:set-modal:");
  });

  it("embed が true の場合に embed モーダルを表示する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({ useEmbed: true });

    await handleStickyMessageSet(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    expect(modal.data.custom_id).toContain("sticky-message:set-embed-modal:");
  });

  it("channelOption が指定された場合にそのチャンネルを使用する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    findByChannelMock.mockResolvedValue(null);
    const interaction = createInteractionMock({
      channelFromOption: { id: "specific-ch", type: ChannelType.GuildText },
    });

    await handleStickyMessageSet(interaction as never);

    expect(findByChannelMock).toHaveBeenCalledWith("specific-ch");
  });

  it("利用可能なチャンネルがない場合（channel が null）に警告を Ephemeral 返信する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    const interaction = {
      reply: vi.fn().mockResolvedValue(undefined),
      showModal: showModalMock,
      channel: null, // no current channel
      options: {
        getChannel: vi.fn(() => null),
        getString: vi.fn(() => null),
      },
    };

    await handleStickyMessageSet(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("getString が null を返す場合（style 未指定）はデフォルトで text スタイルのプレーンテキストモーダルを表示する", async () => {
    const { handleStickyMessageSet } = await import(
      "@/features/sticky-message/commands/usecases/stickyMessageSet"
    );
    findByChannelMock.mockResolvedValue(null);
    // getBoolean returns null triggers the ?? false branch
    const interaction = {
      reply: vi.fn().mockResolvedValue(undefined),
      showModal: showModalMock,
      channel: { id: "current-ch", type: ChannelType.GuildText },
      options: {
        getChannel: vi.fn(() => null),
        getString: vi.fn(() => null),
      },
    };

    await handleStickyMessageSet(interaction as never);

    expect(showModalMock).toHaveBeenCalled();
    const modal = showModalMock.mock.calls[0][0];
    expect(modal.data.custom_id).toContain("sticky-message:set-modal:");
  });
});
