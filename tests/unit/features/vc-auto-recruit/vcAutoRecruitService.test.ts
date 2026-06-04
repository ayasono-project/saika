// tests/unit/features/vc-auto-recruit/vcAutoRecruitService.test.ts
// VcAutoRecruitService の投稿（0→1）・除外・連投抑制・募集終了・channelDelete を検証

import { ChannelType } from "discord.js";
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

/** Bot 以外/Bot のメンバー構成から filter().size を持つ members を作る */
function makeMembers(humanCount: number, botCount = 0) {
  const members = [
    ...Array.from({ length: humanCount }, () => ({ user: { bot: false } })),
    ...Array.from({ length: botCount }, () => ({ user: { bot: true } })),
  ];
  return {
    filter: (fn: (m: { user: { bot: boolean } }) => boolean) => ({
      size: members.filter(fn).length,
    }),
  };
}

function makeVoiceChannel(
  id: string,
  humanCount: number,
  botCount = 0,
  name = "VC",
) {
  return {
    id,
    name,
    type: ChannelType.GuildVoice,
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
) {
  return {
    id: "g-1",
    name: "彩園",
    afkChannelId,
    channels: {
      fetch: vi.fn(async (cid: string) =>
        cid === postChannel.id ? postChannel : null,
      ),
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
  activeInvites: [],
  ...overrides,
});

describe("features/vc-auto-recruit/vcAutoRecruitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleVoiceStateUpdate（参加=投稿）", () => {
    it("0人→1人 の最初の参加で招待を投稿し追跡に保存すること", async () => {
      const { settingsService, vacSettingsService } = createServices();
      const post = makePostChannel();
      const guild = makeGuild(post);
      const channel = makeVoiceChannel("vc-1", 1);
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

    it("同一 VC への連投は抑制されること（直近クールダウン内）", async () => {
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
      const newState = {
        channelId: "vc-1",
        guild,
        channel: makeVoiceChannel("vc-1", 1),
        member: makeMember(),
      };
      const oldState = { channelId: null, guild, channel: null };

      await service.handleVoiceStateUpdate(
        oldState as never,
        newState as never,
      );
      await service.handleVoiceStateUpdate(
        oldState as never,
        newState as never,
      );

      expect(post.send).toHaveBeenCalledTimes(1);
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
  });
});
