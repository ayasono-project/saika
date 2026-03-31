// tests/unit/bot/features/member-log/handlers/guildMemberRemoveHandler.test.ts
import { ChannelType } from "discord.js";

// discord.js は static import のため vi.mock factory がホイスト時点で実行される
// EmbedBuilderMock は vi.hoisted() で定義して TDZ を回避する
const { EmbedBuilderMock, embedInstance } = vi.hoisted(() => {
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
  years: 2,
  months: 1,
  days: 5,
}));

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

/** 標準的な退出メンバーモックを生成する */
function makeGuildMember(
  overrides: Partial<{
    user: object | null;
    joinedTimestamp: number | null;
    channelId: string;
    memberCount: number;
  }> = {},
) {
  const channel = makeTextChannel();
  const channelId = overrides.channelId ?? "ch-1";
  const channelMap = new Map<string, unknown>([[channelId, channel]]);
  return {
    user:
      overrides.user !== undefined
        ? overrides.user
        : {
            id: "user-1",
            displayName: "TestUser",
            createdTimestamp: new Date("2021-06-15").getTime(),
            displayAvatarURL: vi.fn(() => "https://cdn.example.com/avatar.png"),
          },
    guild: {
      id: "guild-1",
      name: "TestGuild",
      memberCount: overrides.memberCount ?? 99,
      channels: {
        fetch: vi.fn(async (id: string) => channelMap.get(id) ?? null),
        _map: channelMap,
      },
      systemChannel: { send: vi.fn().mockResolvedValue(undefined) },
    },
    joinedTimestamp:
      overrides.joinedTimestamp !== undefined
        ? overrides.joinedTimestamp
        : new Date("2025-01-01").getTime(),
    _channel: channel,
  };
}

// handleGuildMemberRemove の早期リターン・正常フロー・エラー処理を検証
describe("bot/features/member-log/handlers/guildMemberRemoveHandler", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 設定取得・チャンネル解決の早期リターン分岐を検証
  describe("early returns", () => {
    it("config が null の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue(null);
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("config.enabled が false の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: false,
        channelId: "ch-1",
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("channelId が未設定の場合は channel.send が呼ばれないことを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("チャンネルが fetch で見つからない場合に disableAndClearChannel が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "unknown-ch",
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(disableAndClearChannelMock).toHaveBeenCalledWith("guild-1");
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.channel_deleted_config_cleared"),
      );
      expect(member._channel.send).not.toHaveBeenCalled();
    });

    it("テキストチャンネル以外の場合に disableAndClearChannel が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-voice",
      });
      const member = makeGuildMember();
      const voiceChannel = { type: ChannelType.GuildVoice, send: vi.fn() };
      (member.guild.channels._map as Map<string, unknown>).set(
        "ch-voice",
        voiceChannel,
      );

      await handleGuildMemberRemove(member as never);

      expect(disableAndClearChannelMock).toHaveBeenCalledWith("guild-1");
      expect(loggerMock.warn).toHaveBeenCalled();
      expect(voiceChannel.send).not.toHaveBeenCalled();
    });
  });

  // 正常フロー（Embed 送信・サムネイル・カスタムメッセージ）を検証
  describe("success flow", () => {
    it("有効な設定で channel.send が embeds を含む引数で呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) }),
      );
    });

    it("アバター URL が存在する場合に setThumbnail が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });

      await handleGuildMemberRemove(makeGuildMember() as never);

      expect(embedInstance.setThumbnail).toHaveBeenCalledWith(
        "https://cdn.example.com/avatar.png",
      );
    });

    it("member.user が null の場合でも channel.send が呼ばれ setThumbnail は呼ばれないことを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember({ user: null });

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).toHaveBeenCalled();
      expect(embedInstance.setThumbnail).not.toHaveBeenCalled();
    });

    it("joinedTimestamp が null の場合でも channel.send が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });

      await handleGuildMemberRemove(
        makeGuildMember({ joinedTimestamp: null }) as never,
      );

      expect(embedInstance.addFields).toHaveBeenCalled();
    });

    it("leaveMessage が設定されている場合に content が渡されることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: "さようなら {userMention}！",
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      const callArgs = (member._channel.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.content).toContain("<@user-1>");
    });

    it("leaveMessage が未設定の場合に content が undefined であることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: undefined,
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      const callArgs = (member._channel.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.content).toBeUndefined();
    });

    it("calcDuration が years=0 months=0 を返す場合でも embed が送信されることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      calcDurationMock.mockReturnValueOnce({ years: 0, months: 0, days: 5 });
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("calcDuration が months=0 days=0 を返す場合でも embed が送信されることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      calcDurationMock.mockReturnValueOnce({ years: 1, months: 0, days: 0 });
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember();

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("joinedTimestamp が undefined の場合に stayDays の ?? 0 フォールバックを通って embed が送信されることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember({ joinedTimestamp: undefined as never });

      await handleGuildMemberRemove(member as never);

      expect(member._channel.send).toHaveBeenCalled();
    });

    it("送信成功後に logger.debug が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });

      await handleGuildMemberRemove(makeGuildMember() as never);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.leave_notification_sent"),
      );
    });

    // joinedTimestamp が undefined（number | null 型に対して TypeScript 上 undefined は来ないが、
    // 実行時には起き得る）の場合に stayDays の `?? 0` フォールバックが動作することを確認する
    it("実行時に joinedTimestamp が undefined の場合でも stayDays の ?? 0 フォールバックで embed が送信されることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const channel = makeTextChannel();
      // makeGuildMember ヘルパーは undefined を渡すとデフォルト値を使ってしまうため、
      // joinedTimestamp: undefined を直接持つオブジェクトを構築する
      const member = {
        user: {
          id: "user-1",
          displayName: "TestUser",
          createdTimestamp: new Date("2021-06-15").getTime(),
          displayAvatarURL: vi.fn(() => "https://cdn.example.com/avatar.png"),
        },
        guild: {
          id: "guild-1",
          name: "TestGuild",
          memberCount: 99,
          channels: {
            fetch: vi.fn(async (id: string) =>
              id === "ch-1" ? channel : null,
            ),
          },
        },
        joinedTimestamp: undefined,
        _channel: channel,
      };

      await handleGuildMemberRemove(member as never);

      expect(channel.send).toHaveBeenCalled();
    });
  });

  // エラー発生時に Bot がクラッシュしないことを検証
  describe("error handling", () => {
    it("channel.send が例外を投げた場合に logger.error が呼ばれることを確認", async () => {
      const { handleGuildMemberRemove } = await import(
        "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
      );
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ch-1",
        leaveMessage: null,
      });
      const member = makeGuildMember();
      (member._channel.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("send failed"),
      );

      await expect(
        handleGuildMemberRemove(member as never),
      ).resolves.toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining("memberLog:log.notification_failed"),
        expect.any(Object),
      );
    });
  });
});
