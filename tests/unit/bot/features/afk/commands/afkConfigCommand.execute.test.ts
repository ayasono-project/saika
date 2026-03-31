// tests/unit/bot/features/afk/commands/afkConfigCommand.execute.test.ts

import { ChannelType } from "discord.js";
import { executeAfkConfigCommand } from "@/bot/features/afk/commands/afkConfigCommand.execute";
import { PermissionError } from "@/shared/errors/customErrors";

const setAfkChannelMock = vi.fn();
const getAfkConfigMock = vi.fn();
const saveAfkConfigMock = vi.fn();
const tGuildMock = vi.fn();
const tDefaultMock = vi.fn((key: string) => `default:${key}`);
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
  kind: "success",
}));
const createInfoEmbedMock = vi.fn((description: string) => ({
  description,
  kind: "info",
}));
const createWarningEmbedMock = vi.fn((description: string) => ({
  description,
  kind: "warning",
}));

vi.mock("@/shared/features/afk/afkConfigDefaults", () => ({
  createDefaultAfkConfig: () => ({
    enabled: false,
    channelId: null,
  }),
}));

vi.mock("@/shared/features/afk/afkConfigService", () => ({
  setAfkChannel: (...args: unknown[]) => setAfkChannelMock(...args),
  getAfkConfig: (...args: unknown[]) => getAfkConfigMock(...args),
  saveAfkConfig: (...args: unknown[]) => saveAfkConfigMock(...args),
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
  tDefault: (key: string) => tDefaultMock(key),
  tGuild: (guildId: string, key: string, params?: Record<string, unknown>) =>
    tGuildMock(guildId, key, params),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
  createInfoEmbed: (description: string) => createInfoEmbedMock(description),
  createWarningEmbed: (description: string) =>
    createWarningEmbedMock(description),
}));

function createInteraction(subcommand: string) {
  return {
    guildId: "guild-1",
    locale: "ja",
    memberPermissions: {
      has: vi.fn(() => true),
    },
    options: {
      getSubcommand: vi.fn(() => subcommand),
      getChannel: vi.fn(() => ({
        id: "afk-channel",
        type: ChannelType.GuildVoice,
      })),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// afkConfigCommand の実行ロジックが
// 権限チェック・サブコマンド分岐（set-channel / view）を正しく処理するかを検証する
describe("bot/features/afk/commands/afkConfigCommand.execute", () => {
  // 各ケースで翻訳・設定取得のモックが一定の返却値を持つよう準備する
  beforeEach(() => {
    vi.clearAllMocks();
    // tInteraction mock returns key as-is (no setup needed)
    getAfkConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "afk-channel",
    });
  });

  it("ManageGuild 権限を持たないメンバーがコマンドを実行した場合は ValidationError を投げる", async () => {
    const interaction = createInteraction("set-channel");
    interaction.memberPermissions.has.mockReturnValue(false);

    await expect(
      executeAfkConfigCommand(interaction as never),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("set-channel サブコマンドで AFK チャンネルを設定し成功返信する", async () => {
    const interaction = createInteraction("set-channel");

    await executeAfkConfigCommand(interaction as never);

    expect(setAfkChannelMock).toHaveBeenCalledWith("guild-1", "afk-channel");
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "afk:user-response.set_channel_success",
          kind: "success",
        },
      ],
      flags: 64,
    });
  });

  it("view サブコマンドで現在の設定を表示する", async () => {
    const interaction = createInteraction("view");

    await executeAfkConfigCommand(interaction as never);

    expect(getAfkConfigMock).toHaveBeenCalledWith("guild-1");
    expect(createInfoEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "", kind: "info" }],
      flags: 64,
    });
  });

  it("view サブコマンドで未設定時も createInfoEmbed で統一フォーマット表示する", async () => {
    getAfkConfigMock.mockResolvedValue(null);
    const interaction = createInteraction("view");

    await executeAfkConfigCommand(interaction as never);

    expect(createInfoEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("clear-channel サブコマンドで AFK チャンネル設定を解除する", async () => {
    const interaction = createInteraction("clear-channel");

    await executeAfkConfigCommand(interaction as never);

    expect(saveAfkConfigMock).toHaveBeenCalledWith("guild-1", {
      enabled: false,
      channelId: null,
    });
    expect(createSuccessEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: 64,
      }),
    );
  });
});
