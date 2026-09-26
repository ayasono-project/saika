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
  // 通知にどのチャンネルが載ったかを検証できるよう、パラメータも文字列に含める
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
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

/**
 * テスト用の interaction を生成する
 * guild.channels.fetch() は引数なしで channels の一覧を、ID 付きでは threads から1件を返す
 * （実 API と同じく、一覧取得はスレッドを含まず、個別取得は見つからなければ失敗する）
 */
function makeInteraction(opts: {
  guildId?: string | null;
  meNull?: boolean;
  channels?: (object | null)[];
  threads?: { id: string }[];
}) {
  const {
    guildId = "guild-1",
    meNull = false,
    channels = [],
    threads = [],
  } = opts;

  const me = meNull
    ? null
    : {
        displayName: "Bot",
      };

  const collection = makeChannelCollection(channels);
  const threadMap = new Map(threads.map((th) => [th.id, th]));
  const guild = guildId
    ? {
        id: guildId,
        members: { me },
        channels: {
          fetch: vi.fn(async (id?: string) => {
            if (id === undefined) return collection;
            const thread = threadMap.get(id);
            if (!thread) throw new Error("Unknown Channel");
            return thread;
          }) as Mock,
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
      "@/features/message-delete/commands/usecases/buildTargetChannels"
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

  it("テキスト以外のチャンネルIDを指定した場合はスキップして通知する", async () => {
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
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("<#ch-cat>"),
    );
  });

  // ── スレッド・解決できない ID（一覧取得はスレッドを返さないため個別取得で補う）──

  it("スレッドだけを指定した場合は個別取得で解決して対象にする", async () => {
    const { buildTargetChannels } = await loadModule();
    const thread = {
      id: "th-1",
      type: ChannelType.PublicThread,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({ threads: [thread] });
    const result = await buildTargetChannels(interaction as never, ["th-1"]);
    expect(result).toEqual([thread]);
    expect(interaction.guild?.channels.fetch).toHaveBeenCalledWith("th-1");
    expect(createWarningEmbedMock).not.toHaveBeenCalled();
    expect(createErrorEmbedMock).not.toHaveBeenCalled();
  });

  it("通常のチャンネルとスレッドを混ぜて指定した場合は両方を対象にし、個別取得はスレッドだけに行う", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const thread = {
      id: "th-1",
      type: ChannelType.PrivateThread,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [thread],
    });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "th-1",
    ]);
    expect(result).toEqual([textCh, thread]);
    expect(interaction.guild?.channels.fetch).not.toHaveBeenCalledWith("ch-1");
    expect(interaction.guild?.channels.fetch).toHaveBeenCalledWith("th-1");
  });

  it("解決できない ID は黙って落とさず、スキップとして通知する", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const interaction = makeInteraction({ channels: [textCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "missing",
    ]);
    expect(result).toEqual([textCh]);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("<#missing>"),
    );
    expect(interaction.followUp).toHaveBeenCalled();
  });

  it("解決できない ID だけを指定した場合は null を返してエラーを送信する", async () => {
    const { buildTargetChannels } = await loadModule();
    const interaction = makeInteraction({});
    const result = await buildTargetChannels(interaction as never, ["missing"]);
    expect(result).toBeNull();
    expect(createErrorEmbedMock).toHaveBeenCalled();
  });

  it("Bot が権限を持たないスレッドはスキップして通知する", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = {
      id: "ch-1",
      type: ChannelType.GuildText,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => true) })),
    };
    const deniedThread = {
      id: "th-1",
      type: ChannelType.PublicThread,
      isTextBased: () => true,
      permissionsFor: vi.fn(() => ({ has: vi.fn(() => false) })),
    };
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [deniedThread],
    });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "th-1",
    ]);
    expect(result).toEqual([textCh]);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("<#th-1>"),
    );
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
