// buildTargetChannels: channelIds 配列を受け取り、対象チャンネルリストを構築する

import { ChannelType, GuildMember, PermissionFlagsBits } from "discord.js";
import type { Mock } from "vitest";

const createWarningEmbedMock = vi.fn((d: string, o?: { title?: string }) => ({
  _type: "warning",
  description: d,
  title: o?.title,
}));
const createErrorEmbedMock = vi.fn((d: string, o?: { title?: string }) => ({
  _type: "error",
  description: d,
  title: o?.title,
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: (d: string, o?: { title?: string }) =>
    createWarningEmbedMock(d, o),
  createErrorEmbed: (d: string, o?: { title?: string }) =>
    createErrorEmbedMock(d, o),
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
    warn: vi.fn(),
  },
}));

import { logger } from "@/shared/utils/logger";

/** 実行者のユーザーID */
const EXECUTOR_ID = "user-1";

/** Bot の GuildMember に見立てたオブジェクト（permissionsFor のモックが Bot か実行者かを見分ける） */
const BOT_MEMBER = { displayName: "Bot", _kind: "bot" };

/** 実行者の GuildMember に見立てたオブジェクト（guild.members.fetch が返す） */
const EXECUTOR_MEMBER = { id: EXECUTOR_ID, _kind: "executor" };

/**
 * Bot と実行者で結果を分けられる permissionsFor のモックを生成する
 * @param opts bot: Bot に必要な権限があるか / executor: 実行者に必要な権限があるか / executorManageThreads: 実行者にスレッド管理の権限があるか
 * @returns permissionsFor のモック
 */
function makePermissionsFor(
  opts: {
    bot?: boolean;
    executor?: boolean;
    executorManageThreads?: boolean;
  } = {},
) {
  const { bot = true, executor = true, executorManageThreads = false } = opts;
  return vi.fn((who: { _kind?: string }) => {
    if (who?._kind === "bot") return { has: vi.fn(() => bot) };
    return {
      has: vi.fn((perm: unknown) =>
        perm === PermissionFlagsBits.ManageThreads
          ? executorManageThreads
          : executor,
      ),
    };
  });
}

/**
 * テスト用のテキストチャンネル（またはスレッド）を生成する
 * @param id チャンネルID
 * @param opts type: チャンネル種別 / textBased: テキスト系か / その他は makePermissionsFor と同じ
 * @returns チャンネルのモック
 */
function makeChannel(
  id: string,
  opts: {
    type?: ChannelType;
    textBased?: boolean;
    bot?: boolean;
    executor?: boolean;
    executorManageThreads?: boolean;
    threadMemberFetch?: Mock;
  } = {},
) {
  const { type = ChannelType.GuildText, textBased = true } = opts;
  return {
    id,
    type,
    isTextBased: () => textBased,
    permissionsFor: makePermissionsFor(opts),
    members: {
      fetch:
        opts.threadMemberFetch ??
        (vi.fn().mockRejectedValue(new Error("Unknown Member")) as Mock),
    },
  };
}

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
 * guild.channels.fetchActiveThreads() は threads を進行中のスレッドとして返す
 * guild.members.fetch(userId) は実行者の GuildMember を返す（interaction.member は GuildMember ではない想定）
 */
function makeInteraction(opts: {
  guildId?: string | null;
  meNull?: boolean;
  channels?: (object | null)[];
  threads?: { id: string }[];
  activeThreadsError?: boolean;
  member?: object | null;
  executorFetchError?: boolean;
}) {
  const {
    guildId = "guild-1",
    meNull = false,
    channels = [],
    threads = [],
    activeThreadsError = false,
    member = null,
    executorFetchError = false,
  } = opts;

  const collection = makeChannelCollection(channels);
  const threadMap = new Map(threads.map((th) => [th.id, th]));
  const guild = guildId
    ? {
        id: guildId,
        members: {
          me: meNull ? null : BOT_MEMBER,
          fetch: vi.fn(async () => {
            if (executorFetchError) throw new Error("Unknown Member");
            return EXECUTOR_MEMBER;
          }) as Mock,
        },
        channels: {
          fetch: vi.fn(async (id?: string) => {
            if (id === undefined) return collection;
            const thread = threadMap.get(id);
            if (!thread) throw new Error("Unknown Channel");
            return thread;
          }) as Mock,
          fetchActiveThreads: vi.fn(async () => {
            if (activeThreadsError) throw new Error("Missing Access");
            return { threads: threadMap, members: new Map() };
          }) as Mock,
        },
      }
    : null;

  return {
    guild,
    guildId,
    locale: "ja",
    user: { id: EXECUTOR_ID },
    member,
    editReply: vi.fn().mockResolvedValue(undefined) as Mock,
    followUp: vi.fn().mockResolvedValue(undefined) as Mock,
  };
}

// buildTargetChannels の channelIds 指定あり/なし・Bot と実行者の権限チェック・null チャンネル処理を検証
describe("bot/features/message-delete/commands/usecases/buildTargetChannels", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // モジュールキャッシュを使い回しても状態を持たないため、テストごとに import して取り出す
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
    const ch1 = makeChannel("ch-1");
    const interaction = makeInteraction({ channels: [ch1] });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(ch1);
  });

  it("テキスト以外のチャンネルIDを指定した場合はスキップして通知する", async () => {
    const { buildTargetChannels } = await loadModule();
    const catCh = makeChannel("ch-cat", {
      type: ChannelType.GuildCategory,
      textBased: false,
    });
    const textCh = makeChannel("ch-text");
    const interaction = makeInteraction({ channels: [catCh, textCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-cat",
      "ch-text",
    ]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(textCh);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("<#ch-cat>"),
      expect.anything(),
    );
  });

  // ── スレッド・解決できない ID（一覧取得はスレッドを返さないため個別取得で補う）──

  it("スレッドだけを指定した場合は個別取得で解決して対象にする", async () => {
    const { buildTargetChannels } = await loadModule();
    const thread = makeChannel("th-1", { type: ChannelType.PublicThread });
    const interaction = makeInteraction({ threads: [thread] });
    const result = await buildTargetChannels(interaction as never, ["th-1"]);
    expect(result).toEqual([thread]);
    expect(interaction.guild?.channels.fetch).toHaveBeenCalledWith("th-1");
    expect(createWarningEmbedMock).not.toHaveBeenCalled();
    expect(createErrorEmbedMock).not.toHaveBeenCalled();
  });

  it("通常のチャンネルとスレッドを混ぜて指定した場合は両方を対象にし、個別取得はスレッドだけに行う", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    // 実行者にスレッド管理の権限があるため、非公開スレッドでも参加の確認は要らない
    const thread = makeChannel("th-1", {
      type: ChannelType.PrivateThread,
      executorManageThreads: true,
    });
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
    const textCh = makeChannel("ch-1");
    const interaction = makeInteraction({ channels: [textCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "missing",
    ]);
    expect(result).toEqual([textCh]);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("<#missing>"),
      expect.anything(),
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
    const textCh = makeChannel("ch-1");
    const deniedThread = makeChannel("th-1", {
      type: ChannelType.PublicThread,
      bot: false,
    });
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
      expect.anything(),
    );
  });

  it("Bot がアクセスできないチャンネルをスキップして Bot 権限不足の見出しで警告を送信する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedCh = makeChannel("ch-1");
    const deniedCh = makeChannel("ch-2", { bot: false });
    const interaction = makeInteraction({ channels: [allowedCh, deniedCh] });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "ch-2",
    ]);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(allowedCh);
    expect(createWarningEmbedMock).toHaveBeenCalledTimes(1);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "messageDelete:user-response.channel_partial_skip:",
      ),
      { title: "common:title_bot_permission_denied" },
    );
  });

  it("指定チャンネルすべてにアクセスできない場合は null を返してエラーを送信する", async () => {
    const { buildTargetChannels } = await loadModule();
    const deniedCh = makeChannel("ch-1", { bot: false });
    const interaction = makeInteraction({ channels: [deniedCh] });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toBeNull();
    expect(createErrorEmbedMock).toHaveBeenCalledWith(
      "messageDelete:user-response.channel_all_no_access",
      { title: "common:title_bot_permission_denied" },
    );
  });

  // ── channelIds 指定あり: 実行者の権限 ──

  it("実行者が権限を持たないチャンネルは、Bot が扱えても実行者の権限不足としてスキップを通知する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedCh = makeChannel("ch-1");
    const executorDeniedCh = makeChannel("ch-2", { executor: false });
    const interaction = makeInteraction({
      channels: [allowedCh, executorDeniedCh],
    });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "ch-2",
    ]);
    expect(result).toEqual([allowedCh]);
    // Bot の権限不足の見出し・文言ではなく、実行者用のもので通知する
    expect(createWarningEmbedMock).toHaveBeenCalledTimes(1);
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'messageDelete:user-response.channel_partial_skip_member:{"channels":"<#ch-2>"}',
      ),
      { title: "common:title_permission_denied" },
    );
  });

  it("実行者が指定チャンネルのどれにも権限を持たない場合は null を返し、実行者の権限不足のエラーを出す", async () => {
    const { buildTargetChannels } = await loadModule();
    const executorDeniedCh = makeChannel("ch-1", { executor: false });
    const interaction = makeInteraction({ channels: [executorDeniedCh] });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toBeNull();
    expect(createErrorEmbedMock).toHaveBeenCalledTimes(1);
    expect(createErrorEmbedMock).toHaveBeenCalledWith(
      "messageDelete:user-response.channel_all_no_access_member",
      { title: "common:title_permission_denied" },
    );
  });

  it("実行者の権限不足と Bot の権限不足が混ざった場合は、理由ごとに分けて1回で通知する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedCh = makeChannel("ch-1");
    const executorDeniedCh = makeChannel("ch-2", { executor: false });
    const botDeniedCh = makeChannel("ch-3", { bot: false });
    const interaction = makeInteraction({
      channels: [allowedCh, executorDeniedCh, botDeniedCh],
    });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "ch-2",
      "ch-3",
    ]);
    expect(result).toEqual([allowedCh]);
    expect(interaction.followUp).toHaveBeenCalledTimes(1);
    const { embeds } = interaction.followUp.mock.calls[0][0] as {
      embeds: { description: string; title: string }[];
    };
    expect(embeds).toEqual([
      expect.objectContaining({
        description: expect.stringContaining("<#ch-2>"),
        title: "common:title_permission_denied",
      }),
      expect.objectContaining({
        description: expect.stringContaining("<#ch-3>"),
        title: "common:title_bot_permission_denied",
      }),
    ]);
  });

  it("実行者が参加しておらずスレッド管理の権限も無い非公開スレッドは、親チャンネルの権限があってもスキップする", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    const privateThread = makeChannel("th-1", {
      type: ChannelType.PrivateThread,
    });
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [privateThread],
    });
    const result = await buildTargetChannels(interaction as never, [
      "ch-1",
      "th-1",
    ]);
    expect(result).toEqual([textCh]);
    expect(privateThread.members.fetch).toHaveBeenCalledWith({
      member: EXECUTOR_ID,
      force: true,
    });
    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      expect.stringContaining("channel_partial_skip_member"),
      { title: "common:title_permission_denied" },
    );
  });

  it("実行者が参加している非公開スレッドは、スレッド管理の権限が無くても対象にする", async () => {
    const { buildTargetChannels } = await loadModule();
    const privateThread = makeChannel("th-1", {
      type: ChannelType.PrivateThread,
      threadMemberFetch: vi.fn().mockResolvedValue({ id: EXECUTOR_ID }),
    });
    const interaction = makeInteraction({ threads: [privateThread] });
    const result = await buildTargetChannels(interaction as never, ["th-1"]);
    expect(result).toEqual([privateThread]);
  });

  it("interaction.member が GuildMember の場合は、それを実行者として使い取り直さない", async () => {
    const { buildTargetChannels } = await loadModule();
    const cachedMember = Object.assign(Object.create(GuildMember.prototype), {
      _kind: "executor",
    });
    const ch1 = makeChannel("ch-1");
    const interaction = makeInteraction({
      channels: [ch1],
      member: cachedMember,
    });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toEqual([ch1]);
    expect(ch1.permissionsFor).toHaveBeenCalledWith(cachedMember);
    expect(interaction.guild?.members.fetch).not.toHaveBeenCalled();
  });

  it("実行者のメンバー情報を取得できない場合は、どのチャンネルも対象にせず warn を出す", async () => {
    const { buildTargetChannels } = await loadModule();
    const ch1 = makeChannel("ch-1");
    const interaction = makeInteraction({
      channels: [ch1],
      executorFetchError: true,
    });
    const result = await buildTargetChannels(interaction as never, ["ch-1"]);
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.executor_fetch_failed"),
    );
    expect(createErrorEmbedMock).toHaveBeenCalledWith(
      "messageDelete:user-response.channel_all_no_access_member",
      { title: "common:title_permission_denied" },
    );
  });

  // ── channelIds 未指定（空配列）──

  it("channelIds が空の場合はギルドからアクセス可能なチャンネルを返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const textChannel = makeChannel("ch-1");
    const voiceChannel = makeChannel("ch-2", { textBased: false });
    const interaction = makeInteraction({
      channels: [textChannel, voiceChannel],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(textChannel);
  });

  it("me が設定されている場合に Bot の権限がないチャンネルを除外する", async () => {
    const { buildTargetChannels } = await loadModule();
    const allowedChannel = makeChannel("ch-1");
    const deniedChannel = makeChannel("ch-2", { bot: false });
    const interaction = makeInteraction({
      channels: [allowedChannel, deniedChannel],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toBe(allowedChannel);
  });

  it("me が null の場合は Bot の権限を見ずに、実行者が扱えるテキストチャンネルをすべて返す", async () => {
    const { buildTargetChannels } = await loadModule();
    const ch1 = makeChannel("ch-1", { bot: false });
    const ch2 = makeChannel("ch-2", { bot: false });
    const interaction = makeInteraction({
      channels: [ch1, ch2],
      meNull: true,
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(2);
  });

  it("コレクション内の null チャンネルを適切に処理する", async () => {
    const { buildTargetChannels } = await loadModule();
    const validChannel = makeChannel("ch-1");
    const interaction = makeInteraction({
      channels: [null, validChannel, null],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toHaveLength(1);
  });

  it("channelIds が空の場合は進行中のスレッドも候補に含める", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    const thread = makeChannel("th-1", { type: ChannelType.PublicThread });
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [thread],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([textCh, thread]);
  });

  it("channelIds が空の場合、Bot が権限を持たない進行中のスレッドは候補から除く", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    const deniedThread = makeChannel("th-1", {
      type: ChannelType.PublicThread,
      bot: false,
    });
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [deniedThread],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([textCh]);
  });

  it("channelIds が空で進行中のスレッドの取得に失敗した場合は、スレッド抜きで続行し warn を出す", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    const interaction = makeInteraction({
      channels: [textCh],
      activeThreadsError: true,
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([textCh]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.active_threads_fetch_failed"),
    );
  });

  // ── channelIds 未指定（空配列）: 実行者の権限 ──

  it("channelIds が空の場合、実行者が見られないチャンネルは通知せずに除く", async () => {
    const { buildTargetChannels } = await loadModule();
    const visibleCh = makeChannel("ch-1");
    const hiddenCh = makeChannel("ch-staff", { executor: false });
    const interaction = makeInteraction({
      channels: [visibleCh, hiddenCh],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([visibleCh]);
    // 見られないチャンネルの存在を知らせないよう、スキップ通知は出さない
    expect(interaction.followUp).not.toHaveBeenCalled();
    expect(createWarningEmbedMock).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        'messageDelete:log.executor_no_access_excluded:{"count":1}',
      ),
    );
  });

  it("channelIds が空の場合、実行者が参加しておらずスレッド管理の権限も無い非公開スレッドは除く", async () => {
    const { buildTargetChannels } = await loadModule();
    const textCh = makeChannel("ch-1");
    const privateThread = makeChannel("th-private", {
      type: ChannelType.PrivateThread,
    });
    const interaction = makeInteraction({
      channels: [textCh],
      threads: [privateThread],
    });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([textCh]);
  });

  it("channelIds が空の場合、実行者にスレッド管理の権限があれば非公開スレッドも参加の確認なしで含める", async () => {
    const { buildTargetChannels } = await loadModule();
    const privateThread = makeChannel("th-private", {
      type: ChannelType.PrivateThread,
      executorManageThreads: true,
    });
    const interaction = makeInteraction({ threads: [privateThread] });
    const result = await buildTargetChannels(interaction as never, []);
    expect(result).toEqual([privateThread]);
    expect(privateThread.members.fetch).not.toHaveBeenCalled();
  });
});
