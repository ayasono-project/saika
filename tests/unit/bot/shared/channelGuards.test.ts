import { MessageFlags } from "discord.js";
import { rejectThreadChannel } from "@/bot/shared/channelGuards";

const tInteractionMock = vi.fn((_locale: string, key: string) => key);
const createErrorEmbedMock = vi.fn(
  (_description: string, _options?: unknown) => ({ type: "error-embed" }),
);

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (locale: string, key: string) => tInteractionMock(locale, key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: (description: string, options?: unknown) =>
    createErrorEmbedMock(description, options),
}));

/** テスト対象へ渡す最小構成のインタラクションを組み立てる */
function createInteraction(channel: unknown) {
  return {
    locale: "ja",
    channel,
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// スレッド実行拒否ガードの検証
describe("bot/shared/channelGuards", () => {
  // beforeEach: 呼び出し履歴を消し、各ケースの assert を他ケースから独立させる
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("通常のテキストチャンネルでは false を返し、応答しないこと", async () => {
    const interaction = createInteraction({ isThread: () => false });

    await expect(rejectThreadChannel(interaction as never)).resolves.toBe(
      false,
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("channel が null の場合は false を返し、応答しないこと", async () => {
    const interaction = createInteraction(null);

    await expect(rejectThreadChannel(interaction as never)).resolves.toBe(
      false,
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("スレッドでは true を返し、エフェメラルで拒否を通知すること", async () => {
    const interaction = createInteraction({ isThread: () => true });

    await expect(rejectThreadChannel(interaction as never)).resolves.toBe(true);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ type: "error-embed" }],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("拒否通知の本文とタイトルに機能横断の共通キーを使うこと", async () => {
    const interaction = createInteraction({ isThread: () => true });

    await rejectThreadChannel(interaction as never);

    expect(tInteractionMock).toHaveBeenCalledWith(
      "ja",
      "common:validation.thread_not_supported",
    );
    expect(createErrorEmbedMock).toHaveBeenCalledWith(
      "common:validation.thread_not_supported",
      { title: "common:title_channel_invalid", locale: "ja" },
    );
  });
});
