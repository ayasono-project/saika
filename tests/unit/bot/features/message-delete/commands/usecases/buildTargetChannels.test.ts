// tests/unit/bot/features/message-delete/commands/usecases/buildTargetChannels.test.ts
// buildTargetChannels: channelIds 配列を受け取り、対象チャンネルリストを構築する

import { ChannelType } from "discord.js";
import type { Mock } from "vitest";

const createWarningEmbedMock = vi.fn((d: string) => ({
  _type: "warning",
  description: d,
}));
const createErrorEmbedMock = vi.fn((d: string) => ({
  _type: "error",
  description: d,
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: (d: string) => createWarningEmbedMock(d),
  createErrorEmbed: (d: string) => createErrorEmbedMock(d),
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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
  },
}));

/** guild.channels.fetch が返す Map 風オブジェクトを生成する */
function makeChannelCollection(channels: (object | null)[]) {
  const map = new Map<string, object | null>();
  for (const ch of channels) {
    if (ch && "id" in ch) {
      map.set((ch as { id: string }).id, ch);
    }
  }
  return {
    size: map.size,
    values: () => map.values(),
    get: (id: string) => map.get(id),
  };
}

function makeInteraction(opts: {
  guildId?: string | null;
  meNull?: boolean;
  channels?: (object | null)[];
}) {
  const { guildId = "guild-1", meNull = false, channels = [] } = opts;

  const me = meNull
    ? null
    : {
        displayName: "Bot",
      };

  const guild = guildId
    ? {
        id: guildId,
        members: { me },
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValue(makeChannelCollection(channels)) as Mock,
        },
      }
    : null;

  return {
    guild,
    guildId,
    editReply: vi.fn().mockResolvedValue(undefined) as Mock,
    followUp: vi.fn().mockResolvedValue(undefined) as Mock,
  };
}

// buildTargetChannels の channelIds 指定あり/なし・権限チェック・null チャンネル処理を検証
describe("bot/features/message-delete/commands/usecases/buildTargetChannels", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/buildTargetChannels"
    );
  }

  it("guild が null の場合は null を返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const interaction = makeInteraction({ guildId: null });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toBeNull();
  });

  // ── channelIds 指定あり ──

  it("指定チャンネルIDのテキストチャンネルを返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const ch1 = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({ channels: [ch1] });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(ch1);
  });

  it("テキスト以外のチャンネルIDを指定した場合はスキップする", async () => {
    const { buildTargetChannels } = await loadModule();
    const catCh = {
      id: "ch-cat",
      type: ChannelType.GuildCategory,
      isTextBased: () => false,
    };
    const textCh = {
      id: "ch-text",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({ channels: [catCh, textCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-cat",
      "ch-text",
    ]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(textCh);
  });

  it("Bot がアクセスできないチャンネルをスキップして警告を送信する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedCh = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const deniedCh = {
      id: "ch-2",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => false) })),
    };
    const interaction = makeInteraction({ channels: [allowedCh, deniedCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "ch-2",
    ]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(allowedCh);
    expect(createWarningEmbedMock).toHaveBeenCalled();
  });

  it("指定チャンネルすべてにアクセスできない場合は null を返してエラーを送信する", async () => {
    const { buildTargetChannels } = await loadModule();
    const deniedCh = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => false) })),
    };
    const interaction = makeInteraction({ channels: [deniedCh] });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toBeNull();
    expect(createErrorEmbedMock).toHaveBeenCalled();
  });

  // ── channelIds 未指定（空配列）──

  it("channelIds が空の場合はギルドからアクセス可能なチャンネルを返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const textChannel = {
      id: "ch-1",
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const voiceChannel = {
      id: "ch-2",
      isTextBased: () => false,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({
      channels: [textChannel, voiceChannel],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(textChannel);
  });

  it("me が設定されている場合に Bot の権限がないチャンネルを除外する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedChannel = {
      id: "ch-1",
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const deniedChannel = {
      id: "ch-2",
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => false) })),
    };
    const interaction = makeInteraction({
      channels: [allowedChannel, deniedChannel],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(allowedChannel);
  });

  it("me が null の場合はすべてのテキストチャンネルを返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const ch1 = { id: "ch-1", isTextBased: () => true };
    const ch2 = { id: "ch-2", isTextBased: () => true };
    const interaction = makeInteraction({
      channels: [ch1, ch2],
      meNull: true,
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(2);
  });

  it("コレクション内の null チャンネルを適切に処理する", async () => {
    const { buildTargetChannels } = await loadModule();
    const validChannel = {
      id: "ch-1",
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({
      channels: [null, validChannel, null],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
  });
});
