// tests/unit/bot/commands/vc.test.ts
import { ChannelType, MessageFlags } from "discord.js";

const isManagedVacChannelMock = vi.fn();
const isCreatedVcRecruitChannelMock = vi.fn();
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
}));

// VAC管理判定・VC募集管理判定をモック化
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: () => ({
    isManagedVacChannel: (...args: unknown[]) =>
      isManagedVacChannelMock(...args),
  }),
  getBotVcRecruitRepository: () => ({
    isCreatedVcRecruitChannel: (...args: unknown[]) =>
      isCreatedVcRecruitChannelMock(...args),
  }),
}));

// i18n は固定値化して期待値を安定させる
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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

// Embed 生成結果を簡易オブジェクト化
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
}));

import { executeVcCommand } from "@/bot/features/vc-command/commands/vcCommand.execute";

describe("bot/commands/vc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isManagedVacChannelMock.mockResolvedValue(true);
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
  });

  it("VAC管理対象のVCをリネームしてsuccess embedで返信する", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: {
              channel: { id: "voice-1", type: ChannelType.GuildVoice },
            },
          }),
        },
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: ChannelType.GuildVoice,
            edit: editMock,
          }),
        },
      },
      options: {
        getSubcommand: vi.fn(() => "rename"),
        getString: vi.fn(() => "Renamed VC"),
        getInteger: vi.fn(() => 10),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await executeVcCommand(interaction as never);

    expect(isManagedVacChannelMock).toHaveBeenCalledWith("guild-1", "voice-1");
    expect(editMock).toHaveBeenCalledWith({ name: "Renamed VC" });
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: expect.any(String) }],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("VC募集管理対象のVCをリネームしてsuccess embedで返信する", async () => {
    isManagedVacChannelMock.mockResolvedValue(false);
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: {
              channel: { id: "voice-1", type: ChannelType.GuildVoice },
            },
          }),
        },
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: ChannelType.GuildVoice,
            edit: editMock,
          }),
        },
      },
      options: {
        getSubcommand: vi.fn(() => "rename"),
        getString: vi.fn(() => "Renamed VC"),
        getInteger: vi.fn(() => 10),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await executeVcCommand(interaction as never);

    expect(editMock).toHaveBeenCalledWith({ name: "Renamed VC" });
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: expect.any(String) }],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("管理対象のVCにユーザー上限を設定してsuccess embedで返信する", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: {
              channel: { id: "voice-1", type: ChannelType.GuildVoice },
            },
          }),
        },
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: ChannelType.GuildVoice,
            edit: editMock,
          }),
        },
      },
      options: {
        getSubcommand: vi.fn(() => "limit"),
        getString: vi.fn(),
        getInteger: vi.fn(() => 12),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await executeVcCommand(interaction as never);

    expect(editMock).toHaveBeenCalledWith({ userLimit: 12 });
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: expect.any(String) }],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("limitが0の場合はunlimitedラベルで成功する", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: {
              channel: { id: "voice-1", type: ChannelType.GuildVoice },
            },
          }),
        },
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: ChannelType.GuildVoice,
            edit: editMock,
          }),
        },
      },
      options: {
        getSubcommand: vi.fn(() => "limit"),
        getString: vi.fn(),
        getInteger: vi.fn(() => 0),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await executeVcCommand(interaction as never);

    expect(editMock).toHaveBeenCalledWith({ userLimit: 0 });
    expect(createSuccessEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: expect.any(String) }],
      flags: MessageFlags.Ephemeral,
    });
  });
});
