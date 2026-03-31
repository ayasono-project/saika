// tests/unit/bot/features/sticky-message/commands/usecases/stickyMessageView.test.ts

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
  createInfoEmbed: vi.fn((msg: string) => ({ type: "info", description: msg })),
}));

function createInteractionMock(channelCache?: Map<string, { name: string }>) {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    locale: "ja",
    guild: channelCache ? { channels: { cache: channelCache } } : null,
  };
}

// stickyMessageView ユースケースが
// 登録件数ゼロ・件数あり・チャンネルキャッシュなし・25件超えの各条件で
// 適切なレスポンス（Ephemeral info / セレクトメニュー）を返すかを検証する
describe("bot/features/sticky-message/commands/usecases/stickyMessageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("スティッキーメッセージが 0 件の場合に情報を Ephemeral 返信する", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleStickyMessageView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("スティッキーメッセージが存在する場合にセレクトメニューの選択肢が件数分生成されること", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const stickies = [
      { id: "s1", channelId: "ch-1", content: "Hello World" },
      { id: "s2", channelId: "ch-2", content: "A".repeat(60) },
    ];
    findAllByGuildMock.mockResolvedValue(stickies);
    const channelCache = new Map([["ch-1", { name: "general" }]]);
    const interaction = createInteractionMock(channelCache);

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: { components: { options: unknown[] }[] }[];
    };
    const selectMenu = call.components[0].components[0];
    // 2件分の選択肢が生成されること
    expect(selectMenu.options).toHaveLength(2);
  });

  it("50文字を超えるコンテンツが切り捨てられて省略記号が付くこと", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const longContent = "B".repeat(60);
    const stickies = [{ id: "s1", channelId: "ch-1", content: longContent }];
    findAllByGuildMock.mockResolvedValue(stickies);
    const interaction = createInteractionMock(new Map());

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: {
        components: { options: { data: { description: string } }[] }[];
      }[];
    };
    const option = call.components[0].components[0].options[0];
    expect(option.data.description).toBe("B".repeat(50) + "...");
  });

  it("50文字以下のコンテンツはそのまま表示されること", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const shortContent = "Short message";
    const stickies = [{ id: "s1", channelId: "ch-1", content: shortContent }];
    findAllByGuildMock.mockResolvedValue(stickies);
    const interaction = createInteractionMock(new Map());

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: {
        components: { options: { data: { description: string } }[] }[];
      }[];
    };
    const option = call.components[0].components[0].options[0];
    expect(option.data.description).toBe("Short message");
  });

  it("チャンネルがキャッシュに存在しない場合はチャンネル ID をラベルに使用すること", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const stickies = [{ id: "s1", channelId: "unknown-ch", content: "Hi" }];
    findAllByGuildMock.mockResolvedValue(stickies);
    const interaction = createInteractionMock(new Map());

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: {
        components: { options: { data: { label: string } }[] }[];
      }[];
    };
    const option = call.components[0].components[0].options[0];
    expect(option.data.label).toBe("#unknown-ch");
  });

  it("チャンネルがキャッシュに存在する場合はチャンネル名をラベルに使用すること", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const stickies = [{ id: "s1", channelId: "ch-1", content: "Hi" }];
    findAllByGuildMock.mockResolvedValue(stickies);
    const channelCache = new Map([["ch-1", { name: "general" }]]);
    const interaction = createInteractionMock(channelCache);

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: {
        components: { options: { data: { label: string } }[] }[];
      }[];
    };
    const option = call.components[0].components[0].options[0];
    expect(option.data.label).toBe("#general");
  });

  it("Discord のセレクトメニューは最大 25 項目のため、30件あっても 25件に切り捨てられること", async () => {
    const { handleStickyMessageView } = await import(
      "@/bot/features/sticky-message/commands/usecases/stickyMessageView"
    );
    const stickies = Array.from({ length: 30 }, (_, i) => ({
      id: `s${i}`,
      channelId: `ch-${i}`,
      content: `Content ${i}`,
    }));
    findAllByGuildMock.mockResolvedValue(stickies);
    const interaction = createInteractionMock(new Map());

    await handleStickyMessageView(interaction as never, "guild-1");

    const call = interaction.reply.mock.calls[0][0] as {
      components: { components: { options: unknown[] }[] }[];
    };
    const selectMenu = call.components[0].components[0];
    expect(selectMenu.options).toHaveLength(25);
  });
});
