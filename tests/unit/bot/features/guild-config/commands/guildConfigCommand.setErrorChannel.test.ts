// tests/unit/bot/features/guild-config/commands/guildConfigCommand.setErrorChannel.test.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));

const updateErrorChannelMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    updateErrorChannel: updateErrorChannelMock,
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string) => ({ kind: "success", description: d }),
}));

import { handleSetErrorChannel } from "@/bot/features/guild-config/commands/guildConfigCommand.setErrorChannel";

function createInteraction(channelType: number) {
  return {
    locale: "ja",
    options: {
      getChannel: vi.fn(() => ({ id: "ch-1", type: channelType })),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChatInputCommandInteraction;
}

// set-error-channel のチャンネル種別検証・DB更新・返信を検証
describe("bot/features/guild-config/commands/guildConfigCommand.setErrorChannel", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("テキストチャンネルの場合は updateErrorChannel が呼ばれて成功返信すること", async () => {
    const interaction = createInteraction(ChannelType.GuildText);
    await handleSetErrorChannel(interaction, "guild-1");
    expect(updateErrorChannelMock).toHaveBeenCalledWith("guild-1", "ch-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("テキストチャンネル以外の場合は ValidationError をスローすること", async () => {
    const interaction = createInteraction(ChannelType.GuildVoice);
    await expect(
      handleSetErrorChannel(interaction, "guild-1"),
    ).rejects.toThrow();
    expect(updateErrorChannelMock).not.toHaveBeenCalled();
  });
});
