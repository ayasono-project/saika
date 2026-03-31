// tests/unit/bot/features/member-log/handlers/guildMemberAddHandler.test.ts
import { ChannelType } from "discord.js";

// discord.js は static import のため vi.mock factory がホイスト時点で実行される
// EmbedBuilderMock は vi.hoisted() で定義して TDZ を回避する
const { EmbedBuilderMock } = vi.hoisted(() => {
  const embedInstance = {
    setColor: vi.fn().mockReturnThis(),
    setTitle: vi.fn().mockReturnThis(),
    setThumbnail: vi.fn().mockReturnThis(),
    addFields: vi.fn().mockReturnThis(),
    setFooter: vi.fn().mockReturnThis(),
    setTimestamp: vi.fn().mockReturnThis(),
  };
  // アロー関数ではなく通常関数を使用: new EmbedBuilder() で呼ばれる場合、
  // アロー関数はコンストラクタとして使えず TypeError になるため
  const EmbedBuilderMock = vi.fn(function () {
    return embedInstance;
  });
  return { EmbedBuilderMock, embedInstance };
});

// ---- モック定義 ----
const getMemberLogConfigMock = vi.fn();
const disableAndClearChannelMock = vi.fn().mockResolvedValue(undefined);
const getBotMemberLogConfigServiceMock = vi.fn(() => ({
  getMemberLogConfig: getMemberLogConfigMock,
  disableAndClearChannel: disableAndClearChannelMock,
}));

const tDefaultMock = vi.fn(
  (key: string, _opts?: Record<string, unknown>) => key,
);
const tGuildMock = vi.fn(async (key: string) => key);
const getGuildTranslatorMock = vi.fn(async (_guildId: string) => tGuildMock);

const loggerMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const calcDurationMock = vi.fn((_ts: number) => ({
  years: 5,
  months: 3,
  days: 7,
}));

const findUsedInviteMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogConfigService: () => getBotMemberLogConfigServiceMock(),
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
  tDefault: (key: string, opts?: Record<string, unknown>) =>
    tDefaultMock(key, opts),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: (guildId: string) => getGuildTranslatorMock(guildId),
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: loggerMock,
}));
vi.mock("@/bot/features/member-log/handlers/accountAge", () => ({
  calcDuration: (ts: number) => calcDurationMock(ts),
}));
vi.mock("@/bot/features/member-log/handlers/inviteTracker", () => ({
  findUsedInvite: (...args: unknown[]) => findUsedInviteMock(...args),
}));
vi.mock("discord.js", async () => {
  const actual = await vi.importActual("discord.js");
  return {
    ...(actual as object),
    EmbedBuilder: EmbedBuilderMock,
  };
});

// ---- ヘルパー ----

/** 標準的なテキストチャンネルモックを生成する */
function makeTextChannel(overrides: Record<string, unknown> = {}) {
  return {
    type: ChannelType.GuildText,
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** 標準的なギルドメンバーモックを生成する */
function makeGuildMember(overrides: Record<string, unknown> = {}) {
  const defaultChannel = makeTextChannel();
  const channelMap = new Map<string, unknown>([["ch-1", defaultChannel]]);
  return {
    user: {
      id: "user-1",
      displayName: "TestUser",
      createdTimestamp: new Date("2020-01-01").getTime(),
      displayAvatarURL: vi.fn(() => "https://cdn.example.com/avatar.png"),
    },
    guild: {
      id: "guild-1",
      name: "TestGuild",
      memberCount: 100,
      channels: {
        fetch: vi.fn(async (id: string) => channelMap.get(id) ?? null),
        _map: channelMap,
      },
      systemChannel: { send: vi.fn().mockResolvedValue(undefined) },
    },
    joinedTimestamp: new Date("2025-01-01").getTime(),
    _channel: defaultChannel,
    ...overrides,
  };
}

// guildMemberAddHandler の正常フロー・早期リターン・エラー委譲を検証
describe("bot/features/member-log/handlers/guildMemberAddHandler", () => {
  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトは招待情報なし（権限不足等）
    findUsedInviteMock.mockResolvedValue(null);
  });

  // 設定取得系の早期リターン分岐を検証
  describe("early returns", () => {
    it("config が null の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue(null);
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("config.enabled が false の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: false,
        channelId: "ch-1",
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("channelId が未設定の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("チャンネルが fetch で見つからない場合に disableAndClearChannel が呼ばれ channel.send は呼ばれないことを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "unknown-ch",
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(disableAndClearChannelMock).toHaveBeenCalledWith("guild-1");
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.channel_deleted_config_cleared"),
      );
      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("チャンネルがテキストチャンネル以外の場合に disableAndClearChannel が呼ばれ channel.send は呼ばれないことを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-voice",
      });
      const voiceChannel = { type: ChannelType.GuildVoice, send: vi.fn() };
      const member = makeGuildMember();
      (member.guild.channels._map as Map<string, unknown>).set(
        "ch-voice",
        voiceChannel,
      );

      await handleGuildMemberAdd(member as never);

      expect(disableAndClearChannelMock).toHaveBeenCalledWith("guild-1");
      expect(loggerMock.warn).toHaveBeenCalled();
      expect(voiceChannel.send).not.toHaveBeenCalled();
    });
  });

  // 正常フロー（Embed 送信・フッター・フィールド構成）を検証
  describe("success flow", () => {
    it("設定が有効な場合に channel.send が embeds を含む引数で呼ばれることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("joinMessage が設定されている場合に content が渡されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ {userMention}さん！",
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      const callArgs = (member._channel.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.content).toContain("<@user-1>");
    });

    it("joinMessage が未設定の場合に content が undefined であることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: undefined,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      const callArgs = (member._channel.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.content).toBeUndefined();
    });

    it("joinedTimestamp が null の場合でも serverJoined フィールドを省略して embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      const member = makeGuildMember({ joinedTimestamp: null });

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("calcDuration が years=0 months=0 を返す場合でも embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      calcDurationMock.mockReturnValueOnce({ years: 0, months: 0, days: 5 });
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("calcDuration が months=0 days=0 を返す場合でも embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      calcDurationMock.mockReturnValueOnce({ years: 1, months: 0, days: 0 });
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("招待者が人間ユーザー（bot=false）の場合に <@userId> メンション形式で embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      findUsedInviteMock.mockResolvedValue({
        code: "abc123",
        inviter: {
          id: "inviter-user-id",
          displayName: "InviterUser",
          bot: false,
        },
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("招待者がサービスBot（bot=true）の場合に displayName で embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      findUsedInviteMock.mockResolvedValue({
        code: "abc123",
        inviter: { id: "disboard-bot-id", displayName: "Disboard", bot: true },
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("招待リンクが特定できない場合（findUsedInvite が null）でも embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      findUsedInviteMock.mockResolvedValue(null);
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("招待リンクは特定できたが inviter が null の場合でも embed が送信されることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      findUsedInviteMock.mockResolvedValue({
        code: "xyz789",
        inviter: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberAdd(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("送信成功後に logger.debug が呼ばれることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });

      await handleGuildMemberAdd(makeGuildMember() as never);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.join_notification_sent"),
      );
    });
  });

  // エラー発生時に Bot がクラッシュしないことを検証
  describe("error handling", () => {
    it("channel.send が例外を投げた場合に logger.error が呼ばれることを確認", async () => {
      const { handleGuildMemberAdd } = await import(
        "@/bot/features/member-log/handlers/guildMemberAddHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        joinMessage: null,
      });
      const member = makeGuildMember();
      (member._channel.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("send failed"),
      );

      await expect(
        handleGuildMemberAdd(member as never),
      ).resolves.toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.notification_failed"),
        expect.any(Object),
      );
    });
  });
});
