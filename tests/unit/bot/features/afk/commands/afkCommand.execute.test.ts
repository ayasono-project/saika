// tests/unit/bot/features/afk/commands/afkCommand.execute.test.ts
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { executeAfkCommand } from "@/bot/features/afk/commands/afkCommand.execute";
import { ValidationError } from "@/shared/errors/customErrors";

const getAfkConfigMock = vi.fn();
const tGuildMock = vi.fn();
const tDefaultMock = vi.fn((key: string) => `default:${key}`);
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
}));
const loggerInfoMock = vi.fn();

vi.mock("@/shared/features/afk/afkConfigService", () => ({
  getAfkConfig: (...args: unknown[]) => getAfkConfigMock(...args),
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

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

function createInteraction() {
  const setChannelMock = vi.fn().mockResolvedValue(undefined);
  return {
    guildId: "guild-1",
    locale: "ja",
    user: { id: "user-1" },
    options: {
      getUser: vi.fn(() => null),
    },
    guild: {
      members: {
        fetch: vi.fn().mockResolvedValue({
          voice: {
            channel: { id: "voice-1" },
            setChannel: setChannelMock,
          },
        }),
      },
      channels: {
        fetch: vi.fn().mockResolvedValue({
          id: "afk-channel",
          type: 2,
        }),
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    setChannelMock,
  };
}

// afkCommand の実行ロジックが
// ギルドコンテキストの検証・対象ユーザーの AFK チャンネルへの移動・
// 成功 Embed の返信を正しく行うかを検証する
describe("bot/features/afk/commands/afkCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAfkConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "afk-channel",
    });
    // tInteraction mock returns key as-is (no setup needed)
  });

  it("guildId が null（DM などギルド外）の場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guildId = null as never;

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("対象ユーザーを AFK チャンネルへ移動して成功 embed で返信する", async () => {
    const interaction = createInteraction();

    await executeAfkCommand(interaction as never);

    expect(interaction.setChannelMock).toHaveBeenCalledWith({
      id: "afk-channel",
      type: 2,
    });
    expect(createSuccessEmbedMock).toHaveBeenCalledWith(
      "afk:user-response.moved",
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "afk:user-response.moved" }],
    });
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it("config が null の場合は ValidationError を投げる", async () => {
    getAfkConfigMock.mockResolvedValue(null);
    const interaction = createInteraction();

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("config.enabled が false の場合は ValidationError を投げる", async () => {
    getAfkConfigMock.mockResolvedValue({
      enabled: false,
      channelId: "afk-channel",
    });
    const interaction = createInteraction();

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("config.channelId が未設定の場合は ValidationError を投げる", async () => {
    getAfkConfigMock.mockResolvedValue({ enabled: true, channelId: undefined });
    const interaction = createInteraction();

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("メンバーが見つからない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guild.members.fetch = vi.fn().mockResolvedValue(null);

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("メンバーがボイスチャンネルにいない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guild.members.fetch = vi.fn().mockResolvedValue({
      voice: { channel: null },
    });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("AFK チャンネルが見つからない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guild.channels.fetch = vi.fn().mockResolvedValue(null);

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("AFK チャンネルが GuildVoice チャンネルでない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    // ChannelType.GuildText = 0
    interaction.guild.channels.fetch = vi.fn().mockResolvedValue({
      id: "afk-channel",
      type: 0, // GuildText, not GuildVoice (2)
    });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("setChannel で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    const interaction = createInteraction();
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/guilds/guild-1/members/user-1",
      {},
    );
    const member = await interaction.guild.members.fetch("any");
    member.voice.setChannel = vi.fn().mockRejectedValue(apiError);

    await expect(executeAfkCommand(interaction as never)).rejects.toBe(
      apiError,
    );
  });

  it("user オプションが指定されている場合はそのユーザーを対象にする", async () => {
    const interaction = createInteraction();
    const explicitUser = { id: "user-2" };
    interaction.options.getUser = vi.fn().mockReturnValue(explicitUser);

    await executeAfkCommand(interaction as never);

    expect(interaction.guild.members.fetch).toHaveBeenCalledWith("user-2");
  });
});
