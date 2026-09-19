// tests/unit/features/afk/commands/afkCommand.execute.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { executeAfkCommand } from "@/features/afk/commands/afkCommand.execute";

const getAfkSettingsMock = vi.fn();
const formatActionLogMock = vi.fn((..._a: unknown[]) => ({
  description: "action-log",
}));
const resolveAuditReasonMock = vi.fn((..._a: unknown[]) => "audit-reason");
const presentBulkConfirmMock = vi.fn().mockResolvedValue(undefined);
const loggerInfoMock = vi.fn();

vi.mock("@/features/afk/afkSettingsService", () => ({
  getAfkSettings: (...args: unknown[]) => getAfkSettingsMock(...args),
}));

vi.mock("@/bot/shared/vcActionLog", () => ({
  formatActionLog: (...args: unknown[]) => formatActionLogMock(...args),
  resolveAuditReason: (...args: unknown[]) => resolveAuditReasonMock(...args),
}));

vi.mock("@/bot/shared/vcBulkAction", () => ({
  presentBulkConfirm: (...args: unknown[]) => presentBulkConfirmMock(...args),
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
  tDefault: (key: string) => `default:${key}`,
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

// ChannelType.GuildVoice = 2
const GUILD_VOICE = 2;

function createInteraction() {
  const setChannelMock = vi.fn().mockResolvedValue(undefined);
  const memberInVoice = {
    id: "user-1",
    voice: { channel: { id: "voice-1" }, setChannel: setChannelMock },
  };
  // afk-channel は config の AFK チャンネル、それ以外は対象VC（1名在室）を返す
  const sourceChannel = {
    id: "src-1",
    type: GUILD_VOICE,
    members: new Map([["user-9", { id: "user-9" }]]),
  };
  const afkChannel = {
    id: "afk-channel",
    type: GUILD_VOICE,
    members: new Map(),
  };
  const channelsFetch = vi.fn((id: string) =>
    Promise.resolve(id === "afk-channel" ? afkChannel : sourceChannel),
  );
  return {
    guildId: "guild-1",
    locale: "ja",
    user: { id: "user-1" },
    options: {
      getUser: vi.fn(() => null),
      getChannel: vi.fn(() => null),
    },
    guild: {
      members: { fetch: vi.fn().mockResolvedValue(memberInVoice) },
      channels: { fetch: channelsFetch },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    setChannelMock,
    afkChannel,
    sourceChannel,
  };
}

/** target-member に user-2 を指定した interaction を作る */
function createInteractionWithTargetMember() {
  const interaction = createInteraction();
  interaction.options.getUser = vi.fn().mockReturnValue({ id: "user-2" });
  return interaction;
}

// afkCommand.execute の個別移動 / 一括移動 / 各種バリデーションを検証する
describe("features/afk/commands/afkCommand.execute", () => {
  // 各ケースで AFK 設定を有効状態に戻し、モック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    getAfkSettingsMock.mockResolvedValue({
      enabled: true,
      channelId: "afk-channel",
    });
    formatActionLogMock.mockReturnValue({ description: "action-log" });
    resolveAuditReasonMock.mockReturnValue("audit-reason");
  });

  it("guildId が null（ギルド外）の場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guildId = null as never;

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("config が null の場合は ValidationError を投げる", async () => {
    getAfkSettingsMock.mockResolvedValue(null);
    const interaction = createInteraction();

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("config.enabled が false の場合は ValidationError を投げる", async () => {
    getAfkSettingsMock.mockResolvedValue({
      enabled: false,
      channelId: "afk-channel",
    });
    const interaction = createInteraction();

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

  it("AFK チャンネルが GuildVoice でない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.guild.channels.fetch = vi
      .fn()
      .mockResolvedValue({ id: "afk-channel", type: 0 });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("target-member と target-channel をどちらも省略した場合は ValidationError を投げ、移動も確認ダイアログも行わない", async () => {
    const interaction = createInteraction();

    await expect(executeAfkCommand(interaction as never)).rejects.toThrow(
      "afk:user-response.target_required",
    );
    expect(interaction.guild.members.fetch).not.toHaveBeenCalled();
    expect(interaction.setChannelMock).not.toHaveBeenCalled();
    expect(presentBulkConfirmMock).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("target-member 指定時はそのメンバーを AFK チャンネルへ移動し public で返信する", async () => {
    const interaction = createInteractionWithTargetMember();

    await executeAfkCommand(interaction as never);

    expect(interaction.guild.members.fetch).toHaveBeenCalledWith("user-2");
    expect(interaction.setChannelMock).toHaveBeenCalledWith(
      interaction.afkChannel,
      "audit-reason",
    );
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "afk",
        invokerId: "user-1",
        targetUserId: "user-2",
        destinationChannelId: "afk-channel",
      }),
    );
    // public（ephemeral フラグなし）で返信する
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "action-log" }],
    });
    expect(presentBulkConfirmMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  // target 必須化後も target_required で緑になって素通りしないよう、メッセージキーまで検証する
  it("対象メンバーが見つからない場合は member_not_found の ValidationError を投げる", async () => {
    const interaction = createInteractionWithTargetMember();
    interaction.guild.members.fetch = vi.fn().mockResolvedValue(null);

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(executeAfkCommand(interaction as never)).rejects.toThrow(
      "afk:user-response.member_not_found",
    );
  });

  it("対象メンバーが VC にいない場合は target_not_in_voice の ValidationError を投げる", async () => {
    const interaction = createInteractionWithTargetMember();
    interaction.guild.members.fetch = vi
      .fn()
      .mockResolvedValue({ id: "user-2", voice: { channel: null } });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(executeAfkCommand(interaction as never)).rejects.toThrow(
      "afk:user-response.target_not_in_voice",
    );
  });

  it("setChannel で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    const interaction = createInteractionWithTargetMember();
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/guilds/guild-1/members/user-2",
      {},
    );
    interaction.setChannelMock.mockRejectedValue(apiError);

    await expect(executeAfkCommand(interaction as never)).rejects.toBe(
      apiError,
    );
  });

  it("target-channel 指定時は一括移動の確認ダイアログを表示する", async () => {
    const interaction = createInteraction();
    interaction.options.getChannel = vi
      .fn()
      .mockReturnValue({ id: "src-1", type: GUILD_VOICE });

    await executeAfkCommand(interaction as never);

    expect(presentBulkConfirmMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        action: "afk",
        guildId: "guild-1",
        invokerId: "user-1",
        sourceChannelId: "src-1",
        destinationChannelId: "afk-channel",
      }),
      ["user-9"],
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("対象VCが AFK チャンネル自身の場合は ValidationError を投げる", async () => {
    const interaction = createInteraction();
    interaction.options.getChannel = vi
      .fn()
      .mockReturnValue({ id: "afk-channel", type: GUILD_VOICE });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(presentBulkConfirmMock).not.toHaveBeenCalled();
  });

  it("target-member と target-channel の同時指定は ValidationError を投げる", async () => {
    const interaction = createInteractionWithTargetMember();
    interaction.options.getChannel = vi
      .fn()
      .mockReturnValue({ id: "src-1", type: GUILD_VOICE });

    await expect(
      executeAfkCommand(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
