// tests/unit/bot/features/sticky-message/commands/usecases/stickyMessageRemove.test.ts

import { MessageFlags } from "discord.js";

const findAllByGuildMock = vi.fn();
const tInteractionMock = vi.fn((_locale: string, key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
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
  tInteraction: (_locale: string, key: string) =>
    tInteractionMock(_locale, key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((msg: string, opts?: object) => ({
    type: "info",
    description: msg,
    ...opts,
  })),
}));

function createInteractionMock({
  guildChannels = [] as { id: string; name: string }[],
}: {
  guildChannels?: { id: string; name: string }[];
} = {}) {
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const channelCache = new Map(guildChannels.map((c) => [c.id, c]));
  return {
    reply: replyMock,
    locale: "ja",
    guild: {
      channels: { cache: { get: (id: string) => channelCache.get(id) } },
    },
    _replyMock: replyMock,
  };
}

// sticky-message remove ユースケース（セレクトメニュー表示）のテスト
describe("bot/features/sticky-message/commands/usecases/stickyMessageRemove", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が存在しない場合に未設定メッセージを Ephemeral 返信する", async () => {
    const { handleStickyMessageRemove } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageRemove"
    );
    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleStickyMessageRemove(interaction as never, "guild-1");

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("設定済みチャンネルがある場合にセレクトメニューとボタンを含む返信を送る", async () => {
    const { handleStickyMessageRemove } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageRemove"
    );
    findAllByGuildMock.mockResolvedValue([
      { channelId: "ch-1", content: "Message 1" },
      { channelId: "ch-2", content: "Message 2" },
    ]);
    const interaction = createInteractionMock({
      guildChannels: [
        { id: "ch-1", name: "rules" },
        { id: "ch-2", name: "general" },
      ],
    });

    await handleStickyMessageRemove(interaction as never, "guild-1");

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        components: expect.arrayContaining([
          expect.objectContaining({ components: expect.any(Array) }),
          expect.objectContaining({ components: expect.any(Array) }),
        ]),
      }),
    );
  });

  it("チャンネルキャッシュにない場合は ID をラベルとして使用する", async () => {
    const { handleStickyMessageRemove } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageRemove"
    );
    findAllByGuildMock.mockResolvedValue([
      { channelId: "ch-1", content: "Message 1" },
    ]);
    const interaction = createInteractionMock({ guildChannels: [] });

    await handleStickyMessageRemove(interaction as never, "guild-1");

    // ID フォールバックでもクラッシュせず返信できる
    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });
});
