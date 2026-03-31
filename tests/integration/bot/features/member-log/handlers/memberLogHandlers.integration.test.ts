// tests/integration/bot/features/member-log/handlers/memberLogHandlers.integration.test.ts
/**
 * Member Log Handlers Integration Tests
 * guildMemberAdd / guildMemberRemove ハンドラの統合テスト
 * config取得→ヘルパー群（年齢計算・招待追跡・フォーマット）→Embed構築→送信の
 * フルフローを検証する
 */

import { ChannelType, Collection } from "discord.js";
import type { Mock } from "vitest";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック（翻訳キーをそのまま返す + パラメータ展開）
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

// getGuildTranslator のモック
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: vi.fn(
    async () => (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

// accountAge のモック（date-fns の初期化コストを回避）
vi.mock("@/bot/features/member-log/handlers/accountAge", () => ({
  calcDuration: vi.fn(() => ({ years: 3, months: 2, days: 0 })),
}));

// Composition root のモック
const mockConfigService = {
  getMemberLogConfig: vi.fn(),
  disableAndClearChannel: vi.fn(),
};

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogConfigService: () => mockConfigService,
}));

/** メンバーログ設定を作成するヘルパー */
function createConfig(overrides?: Record<string, unknown>) {
  return {
    enabled: true,
    channelId: "log-ch-1",
    joinMessage: null,
    leaveMessage: null,
    ...overrides,
  };
}

/** GuildMember モックを作成するヘルパー */
function createMember(overrides?: Record<string, unknown>) {
  const sendMock = vi.fn().mockResolvedValue(undefined);
  const systemChannelSendMock = vi.fn().mockResolvedValue(undefined);

  // 招待情報のキャッシュ（inviteTracker 用）
  const inviteFetchMock = vi.fn().mockResolvedValue(new Collection());

  const member = {
    user: {
      id: "user-123",
      displayName: "TestUser",
      createdTimestamp: new Date("2023-01-15T00:00:00Z").getTime(),
      displayAvatarURL: vi.fn(() => "https://cdn.discordapp.com/avatar.png"),
      bot: false,
    },
    guild: {
      id: "guild-1",
      name: "Test Server",
      memberCount: 42,
      channels: {
        fetch: vi.fn().mockResolvedValue({
          id: "log-ch-1",
          type: ChannelType.GuildText,
          send: sendMock,
        }),
      },
      systemChannel: { send: systemChannelSendMock },
      invites: { fetch: inviteFetchMock },
    },
    joinedTimestamp: new Date("2024-06-01T00:00:00Z").getTime(),
    ...overrides,
  };

  return { member, sendMock, systemChannelSendMock, inviteFetchMock };
}

describe("Member Log Handlers Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 時刻を固定して滞在期間の計算を安定させる（calcDuration はモック済み）
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-03-15T12:00:00Z").getTime(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // guildMemberAdd ハンドラ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("guildMemberAdd: 参加通知", () => {
    async function loadHandler() {
      return (
        await import("@/bot/features/member-log/handlers/guildMemberAddHandler")
      ).handleGuildMemberAdd;
    }

    it("メンバー参加時にログチャンネルへEmbed通知を送信すること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      const { member, sendMock } = createMember();

      await handler(member as never);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0];
      // Embed が含まれること
      expect(call.embeds).toHaveLength(1);
      const embed = call.embeds[0];
      // タイトルが参加通知
      expect(embed.data.title).toBe("memberLog:embed.title.join");
      // フィールドにユーザーメンション・アカウント作成日・参加日時・メンバー数が含まれる
      const fieldNames = embed.data.fields.map((f: { name: string }) => f.name);
      expect(fieldNames).toContain("memberLog:embed.field.name.join_username");
      expect(fieldNames).toContain(
        "memberLog:embed.field.name.join_account_created",
      );
      expect(fieldNames).toContain(
        "memberLog:embed.field.name.join_member_count",
      );
    });

    it("アカウント年齢がEmbed内に正しくフォーマットされること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      // 2023-01-15 作成、現在 2026-03-15 → 3年2月0日
      const { member, sendMock } = createMember();

      await handler(member as never);

      const embed = sendMock.mock.calls[0][0].embeds[0];
      const ageField = embed.data.fields.find(
        (f: { name: string }) =>
          f.name === "memberLog:embed.field.name.join_account_created",
      );
      expect(ageField).toBeDefined();
      // アカウント年齢のフォーマット文字列が含まれること
      expect(ageField.value).toContain("age_years");
      expect(ageField.value).toContain("age_months");
    });

    it("カスタム参加メッセージが設定されている場合はcontentに含まれること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(
        createConfig({
          joinMessage:
            "Welcome {userMention} to {serverName}! Member #{memberCount}",
        }),
      );

      const { member, sendMock } = createMember();

      await handler(member as never);

      const call = sendMock.mock.calls[0][0];
      expect(call.content).toBe(
        "Welcome <@user-123> to Test Server! Member #42",
      );
    });

    it("カスタムメッセージ未設定の場合はcontentがundefinedであること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      const { member, sendMock } = createMember();

      await handler(member as never);

      expect(sendMock.mock.calls[0][0].content).toBeUndefined();
    });

    it("招待リンクの使用回数が増加した場合に招待者情報をEmbedに含めること", async () => {
      const handler = await loadHandler();
      // inviteTracker のキャッシュをクリア
      const { clearInviteCacheForTest } = await import(
        "@/bot/features/member-log/handlers/inviteTracker"
      );
      clearInviteCacheForTest();

      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      const invites = new Collection<
        string,
        {
          code: string;
          uses: number;
          inviter: { id: string; displayName: string; bot: boolean } | null;
        }
      >();
      invites.set("abc123", {
        code: "abc123",
        uses: 1,
        inviter: { id: "inviter-1", displayName: "InviterUser", bot: false },
      });

      const { member, sendMock, inviteFetchMock } = createMember();
      inviteFetchMock.mockResolvedValue(invites);

      await handler(member as never);

      const embed = sendMock.mock.calls[0][0].embeds[0];
      const inviteField = embed.data.fields.find(
        (f: { name: string }) =>
          f.name === "memberLog:embed.field.name.join_invited_by",
      );
      expect(inviteField).toBeDefined();
      expect(inviteField.value).toContain("abc123");
      expect(inviteField.value).toContain("<@inviter-1>");
    });

    it("機能が無効の場合は通知を送信しないこと", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(
        createConfig({ enabled: false }),
      );

      const { member, sendMock } = createMember();

      await handler(member as never);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("ログチャンネルが存在しない場合に設定をリセットしてシステムチャンネルへ通知すること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());
      mockConfigService.disableAndClearChannel.mockResolvedValue(undefined);

      const { member, systemChannelSendMock } = createMember();
      // チャンネルが見つからない
      (member.guild.channels.fetch as Mock).mockResolvedValue(null);

      await handler(member as never);

      expect(mockConfigService.disableAndClearChannel).toHaveBeenCalledWith(
        "guild-1",
      );
      expect(systemChannelSendMock).toHaveBeenCalledTimes(1);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // guildMemberRemove ハンドラ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("guildMemberRemove: 退出通知", () => {
    async function loadHandler() {
      return (
        await import(
          "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
        )
      ).handleGuildMemberRemove;
    }

    it("メンバー退出時にログチャンネルへEmbed通知を送信すること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      const { member, sendMock } = createMember();

      await handler(member as never);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0];
      expect(call.embeds).toHaveLength(1);
      const embed = call.embeds[0];
      expect(embed.data.title).toBe("memberLog:embed.title.leave");

      const fieldNames = embed.data.fields.map((f: { name: string }) => f.name);
      expect(fieldNames).toContain("memberLog:embed.field.name.leave_username");
      expect(fieldNames).toContain(
        "memberLog:embed.field.name.leave_server_left",
      );
      expect(fieldNames).toContain(
        "memberLog:embed.field.name.leave_stay_duration",
      );
      expect(fieldNames).toContain(
        "memberLog:embed.field.name.leave_member_count",
      );
    });

    it("滞在期間が正しく計算されてEmbedに含まれること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      // joinedTimestamp: 2024-06-01、現在: 2026-03-15 → 約653日
      const { member, sendMock } = createMember();

      await handler(member as never);

      const embed = sendMock.mock.calls[0][0].embeds[0];
      const stayField = embed.data.fields.find(
        (f: { name: string }) =>
          f.name === "memberLog:embed.field.name.leave_stay_duration",
      );
      expect(stayField).toBeDefined();
      // 年・月・日形式で表示されること（0の単位は省略）
      expect(stayField.value).toContain("age_years");
    });

    it("カスタム退出メッセージのプレースホルダーが全て展開されること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(
        createConfig({
          leaveMessage:
            "{userMention} ({userName}) left {serverName}. Now {memberCount} members.",
        }),
      );

      const { member, sendMock } = createMember();

      await handler(member as never);

      const call = sendMock.mock.calls[0][0];
      expect(call.content).toBe(
        "<@user-123> (TestUser) left Test Server. Now 42 members.",
      );
    });

    it("Partial メンバー（user が null）の場合も退出通知を送信できること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());

      const { member, sendMock } = createMember({ user: null });

      await handler(member as never);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const embed = sendMock.mock.calls[0][0].embeds[0];
      // ユーザー名が unknown になる
      const usernameField = embed.data.fields.find(
        (f: { name: string }) =>
          f.name === "memberLog:embed.field.name.leave_username",
      );
      expect(usernameField.value).toContain("unknown");
    });

    it("機能が無効の場合は通知を送信しないこと", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(
        createConfig({ enabled: false }),
      );

      const { member, sendMock } = createMember();

      await handler(member as never);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("ログチャンネルが存在しない場合に設定をリセットすること", async () => {
      const handler = await loadHandler();
      mockConfigService.getMemberLogConfig.mockResolvedValue(createConfig());
      mockConfigService.disableAndClearChannel.mockResolvedValue(undefined);

      const { member, systemChannelSendMock } = createMember();
      (member.guild.channels.fetch as Mock).mockResolvedValue(null);

      await handler(member as never);

      expect(mockConfigService.disableAndClearChannel).toHaveBeenCalledWith(
        "guild-1",
      );
      expect(systemChannelSendMock).toHaveBeenCalledTimes(1);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 統合シナリオ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("統合シナリオ: 参加→退出の一連のフロー", () => {
    it("同一メンバーの参加通知と退出通知が両方正しく送信されること", async () => {
      const addHandler = (
        await import("@/bot/features/member-log/handlers/guildMemberAddHandler")
      ).handleGuildMemberAdd;
      const removeHandler = (
        await import(
          "@/bot/features/member-log/handlers/guildMemberRemoveHandler"
        )
      ).handleGuildMemberRemove;

      mockConfigService.getMemberLogConfig.mockResolvedValue(
        createConfig({
          joinMessage: "Welcome {userName}!",
          leaveMessage: "Goodbye {userName}!",
        }),
      );

      const { member, sendMock } = createMember();

      // Phase 1: 参加
      await addHandler(member as never);
      expect(sendMock).toHaveBeenCalledTimes(1);
      const joinCall = sendMock.mock.calls[0][0];
      expect(joinCall.content).toBe("Welcome TestUser!");
      expect(joinCall.embeds[0].data.title).toBe("memberLog:embed.title.join");

      // Phase 2: 退出
      await removeHandler(member as never);
      expect(sendMock).toHaveBeenCalledTimes(2);
      const leaveCall = sendMock.mock.calls[1][0];
      expect(leaveCall.content).toBe("Goodbye TestUser!");
      expect(leaveCall.embeds[0].data.title).toBe(
        "memberLog:embed.title.leave",
      );
    });
  });
});
