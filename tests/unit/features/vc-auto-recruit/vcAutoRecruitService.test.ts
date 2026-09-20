// VcAutoRecruitService の投稿（0→1・入室デバウンス）・除外・募集終了・channelDelete を検証

import { ChannelType } from "discord.js";
import { VC_AUTO_RECRUIT_JOIN_DEBOUNCE_MS } from "@/features/vc-auto-recruit/constants/vcAutoRecruit.constants";
import { VcAutoRecruitService } from "@/features/vc-auto-recruit/services/vcAutoRecruitService";

vi.mock("@/shared/locale/helpers", () => ({
  // 翻訳キーをそのまま返すスタブ translator
  getGuildTranslator: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `${prefixKey} ${messageKey}`,
  tDefault: (key: string) => key,
}));

vi.mock("@/shared/utils/errorHandling", () => ({
  executeWithLoggedError: async (operation: () => Promise<void>) => {
    await operation();
  },
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const notifyWarnChannelMock = vi.fn();
vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyWarnChannel: (...args: unknown[]) => notifyWarnChannelMock(...args),
}));

type TestMember = {
  id: string;
  user: {
    bot: boolean;
    displayName: string;
    displayAvatarURL: () => string;
  };
};

/** Bot 以外/Bot のメンバー構成から filter / get / find を持つ members を作る */
function makeMembers(humanCount: number, botCount = 0) {
  const member = (id: string, bot: boolean): TestMember => ({
    id,
    user: {
      bot,
      displayName: "しゅん",
      displayAvatarURL: () => "https://example.com/a.png",
    },
  });
  const members: TestMember[] = [
    ...Array.from({ length: humanCount }, (_, i) =>
      member(`u-${i + 1}`, false),
    ),
    ...Array.from({ length: botCount }, (_, i) => member(`bot-${i + 1}`, true)),
  ];
  return {
    filter: (fn: (m: TestMember) => boolean) => ({
      size: members.filter(fn).length,
    }),
    get: (id: string) => members.find((m) => m.id === id),
    find: (fn: (m: TestMember) => boolean) => members.find(fn),
  };
}

/** 入室デバウンスの待ち時間を進めて予約ジョブを発火させる */
async function runDebounce(): Promise<void> {
  await vi.advanceTimersByTimeAsync(VC_AUTO_RECRUIT_JOIN_DEBOUNCE_MS);
}

function makeVoiceChannel(
  id: string,
  humanCount: number,
  botCount = 0,
  name = "VC",
  parentId: string | null = null,
) {
  return {
    id,
    name,
    parentId,
    type: ChannelType.GuildVoice,
    isVoiceBased: () => true,
    members: makeMembers(humanCount, botCount),
  };
}

function makePostChannel() {
  const message = { edit: vi.fn(async () => undefined) };
  return {
    id: "ch-1",
    type: ChannelType.GuildText,
    send: vi.fn(async () => ({ id: "msg-1" })),
    messages: { fetch: vi.fn(async () => message) },
    message,
  };
}

function makeGuild(
  postChannel: ReturnType<typeof makePostChannel>,
  afkChannelId: string | null = null,
  voiceChannel?: ReturnType<typeof makeVoiceChannel>,
  systemChannel: { send: ReturnType<typeof vi.fn> } | null = null,
) {
  return {
    id: "g-1",
    name: "彩園",
    afkChannelId,
    systemChannel,
    channels: {
      // デバウンス発火時に VC をキャッシュ経由でなく取り直すため、VC も解決できるようにする
      fetch: vi.fn(async (cid: string) => {
        if (cid === postChannel.id) return postChannel;
        if (voiceChannel && cid === voiceChannel.id) return voiceChannel;
        return null;
      }),
    },
  };
}

function makeMember(bot = false) {
  return {
    id: "u-1",
    user: {
      bot,
      displayName: "しゅん",
      displayAvatarURL: () => "https://example.com/a.png",
    },
  };
}

function createServices() {
  const settingsService = {
    getVcAutoRecruitSettings: vi.fn(),
    addActiveInvite: vi.fn(),
    getActiveInvite: vi.fn(),
    removeActiveInvite: vi.fn(),
    removeEnabledChannel: vi.fn(),
    disableAndClearChannel: vi.fn(),
  };
  const vacSettingsService = {
    getVacSettingsOrDefault: vi.fn(async () => ({
      enabled: false,
      triggerChannelIds: [] as string[],
      createdChannels: [],
    })),
  };
  return { settingsService, vacSettingsService };
}

const enabledConfig = (overrides?: Record<string, unknown>) => ({
  enabled: true,
  channelId: "ch-1",
  embedEnabled: true,
  message: undefined,
  // 既定ではテスト VC（"vc-1"）を有効チャンネルとして登録
  enabledChannelIds: ["vc-1"],
  activeInvites: [],
  ...overrides,
});

describe("features/vc-auto-recruit/vcAutoRecruitService", () => {
  // 入室デバウンスを制御するため全体で fake timers を使う
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("handleVoiceStateUpdate（参加=投稿）", () => {
    it("0人→1人 の最初の参加でデバウンス後に招待を投稿し追跡に保存すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const channel = makeVoiceChannel("vc-1", 1);
      const guild = makeGuild(post, null, channel);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel,
          member: makeMember(),
        } as never,
      );

      // デバウンス満了までは投稿しない
      expect(post.send).not.toHaveBeenCalled();
      await runDebounce();

      expect(post.send).toHaveBeenCalledTimes(1);
      expect(settingsService.addActiveInvite).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({
          voiceChannelId: "vc-1",
          postChannelId: "ch-1",
          messageId: "msg-1",
        }),
      );
    });

    it("2人目以降の参加では投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 2),
          member: makeMember(),
        } as never,
      );

      expect(post.send).not.toHaveBeenCalled();
    });

    it("Bot の参加では投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 0, 1),
          member: makeMember(true),
        } as never,
      );

      expect(post.send).not.toHaveBeenCalled();
    });

    it("CreateVC トリガーチャンネルでは投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );
      vacSettingsService.getVacSettingsOrDefault.mockResolvedValue({
        enabled: true,
        triggerChannelIds: ["vc-1"],
        createdChannels: [],
      });

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 1),
          member: makeMember(),
        } as never,
      );

      expect(post.send).not.toHaveBeenCalled();
    });

    it("AFK チャンネルでは投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post, "vc-1");
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 1),
          member: makeMember(),
        } as never,
      );

      expect(post.send).not.toHaveBeenCalled();
    });

    it("機能が無効なら投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig({ enabled: false }),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 1),
          member: makeMember(),
        } as never,
      );

      expect(post.send).not.toHaveBeenCalled();
    });

    it("デバウンス中に全員退出したら投稿しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const joined = makeVoiceChannel("vc-1", 1);
      const emptied = makeVoiceChannel("vc-1", 0);
      const guild = makeGuild(post, null, emptied);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );
      settingsService.getActiveInvite.mockResolvedValue(null);

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      // 入室 → 予約
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel: joined,
          member: makeMember(),
        } as never,
      );
      // 満了前に退出（空室化）
      await service.handleVoiceStateUpdate(
        { channelId: "vc-1", guild, channel: emptied } as never,
        { channelId: null, guild, channel: null } as never,
      );
      await runDebounce();

      expect(post.send).not.toHaveBeenCalled();
    });

    it("デバウンス中に滞在が続けば投稿すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const channel = makeVoiceChannel("vc-1", 1);
      const guild = makeGuild(post, null, channel);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        { channelId: "vc-1", guild, channel, member: makeMember() } as never,
      );
      await runDebounce();

      expect(post.send).toHaveBeenCalledTimes(1);
    });

    it("全員退出 → 入り直しでは予約を取り直して1回だけ投稿すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const joined = makeVoiceChannel("vc-1", 1);
      const emptied = makeVoiceChannel("vc-1", 0);
      const guild = makeGuild(post, null, joined);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig(),
      );
      settingsService.getActiveInvite.mockResolvedValue(null);

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      const join = () =>
        service.handleVoiceStateUpdate(
          { channelId: null, guild, channel: null } as never,
          {
            channelId: "vc-1",
            guild,
            channel: joined,
            member: makeMember(),
          } as never,
        );

      await join();
      // 満了前に抜けて入り直す（旧クールダウンでは嘘の「募集終了」が残っていたケース）
      await service.handleVoiceStateUpdate(
        { channelId: "vc-1", guild, channel: emptied } as never,
        { channelId: null, guild, channel: null } as never,
      );
      await join();
      await runDebounce();

      expect(post.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("チャンネル allowlist ゲート", () => {
    /** 指定の enabledChannelIds で投稿可否を評価するヘルパー */
    async function runJoin(enabledChannelIds: string[]) {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const channel = makeVoiceChannel("vc-1", 1);
      const guild = makeGuild(post, null, channel);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig({ enabledChannelIds }),
      );
      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        { channelId: null, guild, channel: null } as never,
        {
          channelId: "vc-1",
          guild,
          channel,
          member: makeMember(),
        } as never,
      );
      await runDebounce();
      return post;
    }

    it("有効チャンネルに登録された VC では投稿すること", async () => {
      const post = await runJoin(["vc-1"]);
      expect(post.send).toHaveBeenCalledTimes(1);
    });

    it("未登録の VC では投稿しないこと", async () => {
      const post = await runJoin(["vc-2"]);
      expect(post.send).not.toHaveBeenCalled();
    });

    it("有効チャンネル未設定（空）ならどこにも投稿しないこと", async () => {
      const post = await runJoin([]);
      expect(post.send).not.toHaveBeenCalled();
    });
  });

  describe("handleVoiceStateUpdate（退出=募集終了）", () => {
    const ref = {
      voiceChannelId: "vc-1",
      postChannelId: "ch-1",
      messageId: "msg-1",
      createdAt: 1,
    };

    it("VC が空になったら募集終了へ差し替えて追跡から除去すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getActiveInvite.mockResolvedValue(ref);

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 0),
        } as never,
        { channelId: null, guild, channel: null } as never,
      );

      expect(post.message.edit).toHaveBeenCalledTimes(1);
      expect(settingsService.removeActiveInvite).toHaveBeenCalledWith(
        "g-1",
        "vc-1",
      );
    });

    it("開始者が抜けても他に在室者がいれば募集終了しないこと", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getActiveInvite.mockResolvedValue(ref);

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleVoiceStateUpdate(
        {
          channelId: "vc-1",
          guild,
          channel: makeVoiceChannel("vc-1", 1),
        } as never,
        { channelId: null, guild, channel: null } as never,
      );

      expect(post.message.edit).not.toHaveBeenCalled();
      expect(settingsService.removeActiveInvite).not.toHaveBeenCalled();
    });
  });

  describe("handleChannelDelete", () => {
    it("投稿先チャンネル削除時に設定をクリアすること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue({
        ...enabledConfig(),
        activeInvites: [],
      });

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleChannelDelete({
        id: "ch-1",
        guild,
        isDMBased: () => false,
        type: ChannelType.GuildText,
      } as never);

      expect(settingsService.disableAndClearChannel).toHaveBeenCalledWith(
        "g-1",
      );
    });

    it("投稿先チャンネル削除時に管理者へ通知すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const systemChannel = { send: vi.fn(async () => undefined) };
      const guild = makeGuild(post, null, undefined, systemChannel);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue({
        ...enabledConfig(),
        activeInvites: [],
      });

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleChannelDelete({
        id: "ch-1",
        guild,
        isDMBased: () => false,
        type: ChannelType.GuildText,
      } as never);

      // エラーチャンネルとシステムチャンネルの両方へ知らせる（メンバーログと同じ扱い）
      expect(notifyWarnChannelMock).toHaveBeenCalledWith(
        guild,
        "Channel ch-1 not found",
        expect.objectContaining({ feature: "VC自動募集" }),
      );
      expect(systemChannel.send).toHaveBeenCalledWith({
        content: "vcAutoRecruit:user-response.channel_deleted_notice",
      });
    });

    it("システムチャンネルが無いギルドでも設定クリアは完了すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue({
        ...enabledConfig(),
        activeInvites: [],
      });

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleChannelDelete({
        id: "ch-1",
        guild,
        isDMBased: () => false,
        type: ChannelType.GuildText,
      } as never);

      expect(settingsService.disableAndClearChannel).toHaveBeenCalledWith(
        "g-1",
      );
      expect(notifyWarnChannelMock).toHaveBeenCalled();
    });

    it("有効チャンネルが削除されたら enabledChannelIds から除去すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      settingsService.getVcAutoRecruitSettings.mockResolvedValue(
        enabledConfig({ enabledChannelIds: ["vc-2"], activeInvites: [] }),
      );

      const service = new VcAutoRecruitService(
        settingsService as never,
        vacSettingsService as never,
      );
      await service.handleChannelDelete({
        id: "vc-2",
        guild,
        isDMBased: () => false,
        type: ChannelType.GuildVoice,
      } as never);

      expect(settingsService.removeEnabledChannel).toHaveBeenCalledWith(
        "g-1",
        "vc-2",
      );
    });
  });
});
