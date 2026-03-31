// tests/integration/bot/features/afk/commands/afkCommands.integration.test.ts
/**
 * AFK Commands Integration Tests
 * afkCommand / afkConfigCommand の統合テスト
 * 設定→表示→利用のフロー、および各エラーパスを検証する
 */

import {
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";
import type { Mock } from "vitest";
import { PermissionError, ValidationError } from "@/shared/errors/customErrors";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
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
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

// messageResponse のモック
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((desc: string, opts?: { title?: string }) => ({
    type: "success",
    description: desc,
    title: opts?.title,
  })),
  createInfoEmbed: vi.fn(
    (desc: string, opts?: { title?: string; fields?: unknown[] }) => ({
      type: "info",
      description: desc,
      title: opts?.title,
      fields: opts?.fields,
    }),
  ),
  createWarningEmbed: vi.fn((desc: string, opts?: { title?: string }) => ({
    type: "warning",
    description: desc,
    title: opts?.title,
  })),
}));

// afkConfigDefaults のモック
vi.mock("@/shared/features/afk/afkConfigDefaults", () => ({
  createDefaultAfkConfig: () => ({ enabled: false, channelId: null }),
}));

// afkConfigService のモック
const mockGetAfkConfig = vi.fn();
const mockSetAfkChannel = vi.fn();
const mockSaveAfkConfig = vi.fn();

vi.mock("@/shared/features/afk/afkConfigService", () => ({
  getAfkConfig: (...args: unknown[]) => mockGetAfkConfig(...args),
  setAfkChannel: (...args: unknown[]) => mockSetAfkChannel(...args),
  saveAfkConfig: (...args: unknown[]) => mockSaveAfkConfig(...args),
}));

/** ChatInputCommandInteraction のモックを作成する */
function createInteraction(overrides?: Record<string, unknown>) {
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const fetchMemberMock = vi.fn();
  const fetchChannelMock = vi.fn();

  return {
    interaction: {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: { fetch: fetchMemberMock },
        channels: { fetch: fetchChannelMock },
      },
      memberPermissions: new PermissionsBitField([
        PermissionFlagsBits.ManageGuild,
      ]),
      options: {
        getSubcommand: vi.fn(() => "set-channel"),
        getChannel: vi.fn(),
        getUser: vi.fn(() => null),
        getString: vi.fn(),
      },
      reply: replyMock,
      ...overrides,
    },
    replyMock,
    fetchMemberMock,
    fetchChannelMock,
  };
}

describe("AFK Commands Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // afk-config set-channel → view の設定フロー
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("afk-config: 設定→表示フロー", () => {
    async function loadConfigHandler() {
      return (
        await import("@/bot/features/afk/commands/afkConfigCommand.execute")
      ).executeAfkConfigCommand;
    }

    it("set-channel でVCを設定し、view で設定を確認できること", async () => {
      const handler = await loadConfigHandler();

      // Phase 1: set-channel
      const { interaction: setInteraction, replyMock: setReply } =
        createInteraction();
      (setInteraction.options.getSubcommand as Mock).mockReturnValue(
        "set-channel",
      );
      (setInteraction.options.getChannel as Mock).mockReturnValue({
        id: "vc-afk-1",
        type: ChannelType.GuildVoice,
      });
      mockSetAfkChannel.mockResolvedValue(undefined);

      await handler(setInteraction as never);

      expect(mockSetAfkChannel).toHaveBeenCalledWith("guild-1", "vc-afk-1");
      expect(setReply).toHaveBeenCalledTimes(1);
      const setEmbed = setReply.mock.calls[0][0].embeds[0];
      expect(setEmbed.type).toBe("success");

      // Phase 2: view
      const { interaction: viewInteraction, replyMock: viewReply } =
        createInteraction();
      (viewInteraction.options.getSubcommand as Mock).mockReturnValue("view");
      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "vc-afk-1",
      });

      await handler(viewInteraction as never);

      expect(viewReply).toHaveBeenCalledTimes(1);
      const viewEmbed = viewReply.mock.calls[0][0].embeds[0];
      expect(viewEmbed.type).toBe("info");
      expect(viewEmbed.fields).toBeDefined();
      expect(viewEmbed.fields[1].value).toContain("vc-afk-1");
    });

    it("未設定の場合 view は未設定メッセージを返すこと", async () => {
      const handler = await loadConfigHandler();

      const { interaction, replyMock } = createInteraction();
      (interaction.options.getSubcommand as Mock).mockReturnValue("view");
      mockGetAfkConfig.mockResolvedValue(null);

      await handler(interaction as never);

      const embed = replyMock.mock.calls[0][0].embeds[0];
      expect(embed.type).toBe("info");
    });

    it("テキストチャンネルを指定した場合は ValidationError になること", async () => {
      const handler = await loadConfigHandler();

      const { interaction } = createInteraction();
      (interaction.options.getSubcommand as Mock).mockReturnValue(
        "set-channel",
      );
      (interaction.options.getChannel as Mock).mockReturnValue({
        id: "text-ch-1",
        type: ChannelType.GuildText,
      });

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
      expect(mockSetAfkChannel).not.toHaveBeenCalled();
    });

    it("ManageGuild 権限がない場合は PermissionError になること", async () => {
      const handler = await loadConfigHandler();

      const { interaction } = createInteraction({
        memberPermissions: new PermissionsBitField([]),
      });
      (interaction.options.getSubcommand as Mock).mockReturnValue(
        "set-channel",
      );

      await expect(handler(interaction as never)).rejects.toThrow(
        PermissionError,
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /afk コマンド
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("afk: ユーザー移動コマンド", () => {
    async function loadAfkHandler() {
      return (await import("@/bot/features/afk/commands/afkCommand.execute"))
        .executeAfkCommand;
    }

    it("設定済みの場合にユーザーをAFKチャンネルに移動できること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "vc-afk-1",
      });

      const setChannelMock = vi.fn().mockResolvedValue(undefined);
      const { interaction, replyMock, fetchMemberMock, fetchChannelMock } =
        createInteraction();

      // ユーザーオプション未指定 → 自分自身
      (interaction.options.getUser as Mock).mockReturnValue(null);

      // メンバーがVCに参加中
      fetchMemberMock.mockResolvedValue({
        voice: {
          channel: { id: "current-vc" },
          setChannel: setChannelMock,
        },
      });

      // AFKチャンネルが存在する
      const afkChannel = { id: "vc-afk-1", type: ChannelType.GuildVoice };
      fetchChannelMock.mockResolvedValue(afkChannel);

      await handler(interaction as never);

      expect(setChannelMock).toHaveBeenCalledWith(afkChannel);
      expect(replyMock).toHaveBeenCalledTimes(1);
      const embed = replyMock.mock.calls[0][0].embeds[0];
      expect(embed.type).toBe("success");
    });

    it("対象ユーザーを指定して移動できること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "vc-afk-1",
      });

      const setChannelMock = vi.fn().mockResolvedValue(undefined);
      const { interaction, fetchMemberMock, fetchChannelMock } =
        createInteraction();

      // 他のユーザーを指定
      (interaction.options.getUser as Mock).mockReturnValue({
        id: "target-user",
      });

      fetchMemberMock.mockResolvedValue({
        voice: {
          channel: { id: "current-vc" },
          setChannel: setChannelMock,
        },
      });

      fetchChannelMock.mockResolvedValue({
        id: "vc-afk-1",
        type: ChannelType.GuildVoice,
      });

      await handler(interaction as never);

      // target-user のメンバーを fetch
      expect(fetchMemberMock).toHaveBeenCalledWith("target-user");
      expect(setChannelMock).toHaveBeenCalledTimes(1);
    });

    it("AFK未設定の場合は ValidationError になること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue(null);

      const { interaction } = createInteraction();

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
    });

    it("AFK機能が無効の場合は ValidationError になること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({ enabled: false, channelId: "vc-1" });

      const { interaction } = createInteraction();

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
    });

    it("対象ユーザーがVCに未参加の場合は ValidationError になること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "vc-afk-1",
      });

      const { interaction, fetchMemberMock } = createInteraction();
      fetchMemberMock.mockResolvedValue({
        voice: { channel: null },
      });

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
    });

    it("AFKチャンネルが存在しない場合は ValidationError になること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "deleted-vc",
      });

      const { interaction, fetchMemberMock, fetchChannelMock } =
        createInteraction();
      fetchMemberMock.mockResolvedValue({
        voice: { channel: { id: "current-vc" } },
      });
      fetchChannelMock.mockResolvedValue(null);

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
    });

    it("AFKチャンネルがVCでない場合は ValidationError になること", async () => {
      const handler = await loadAfkHandler();

      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "text-ch",
      });

      const { interaction, fetchMemberMock, fetchChannelMock } =
        createInteraction();
      fetchMemberMock.mockResolvedValue({
        voice: { channel: { id: "current-vc" } },
      });
      fetchChannelMock.mockResolvedValue({
        id: "text-ch",
        type: ChannelType.GuildText,
      });

      await expect(handler(interaction as never)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 統合シナリオ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("統合シナリオ: 設定→利用の一連のフロー", () => {
    it("afk-config set-channel で設定後、/afk でユーザーを移動できること", async () => {
      const configHandler = (
        await import("@/bot/features/afk/commands/afkConfigCommand.execute")
      ).executeAfkConfigCommand;
      const afkHandler = (
        await import("@/bot/features/afk/commands/afkCommand.execute")
      ).executeAfkCommand;

      // Phase 1: 管理者が set-channel で AFK チャンネルを設定
      const { interaction: configInteraction } = createInteraction();
      (configInteraction.options.getSubcommand as Mock).mockReturnValue(
        "set-channel",
      );
      (configInteraction.options.getChannel as Mock).mockReturnValue({
        id: "vc-afk-1",
        type: ChannelType.GuildVoice,
      });
      mockSetAfkChannel.mockResolvedValue(undefined);

      await configHandler(configInteraction as never);
      expect(mockSetAfkChannel).toHaveBeenCalledWith("guild-1", "vc-afk-1");

      // Phase 2: ユーザーが /afk で自分を移動
      mockGetAfkConfig.mockResolvedValue({
        enabled: true,
        channelId: "vc-afk-1",
      });

      const setChannelMock = vi.fn().mockResolvedValue(undefined);
      const {
        interaction: afkInteraction,
        replyMock,
        fetchMemberMock,
        fetchChannelMock,
      } = createInteraction();

      fetchMemberMock.mockResolvedValue({
        voice: {
          channel: { id: "current-vc" },
          setChannel: setChannelMock,
        },
      });
      fetchChannelMock.mockResolvedValue({
        id: "vc-afk-1",
        type: ChannelType.GuildVoice,
      });

      await afkHandler(afkInteraction as never);

      expect(setChannelMock).toHaveBeenCalledTimes(1);
      expect(replyMock).toHaveBeenCalledTimes(1);
    });
  });
});
