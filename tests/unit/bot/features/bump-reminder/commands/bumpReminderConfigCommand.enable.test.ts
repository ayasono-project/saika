// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.enable.test.ts
import { handleBumpReminderConfigEnable } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.enable";

const setEnabledMock = vi.fn();
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tGuild: vi.fn(async () => "translated"),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderConfigService: () => ({
    setBumpReminderEnabled: (...args: unknown[]) => setEnabledMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
}));

describe("bot/features/bump-reminder/commands/bumpReminderConfigCommand.enable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnabledMock.mockResolvedValue(undefined);
  });

  it("バンプリマインダーを現在のチャンネルで有効化し成功応答を返す", async () => {
    const interaction = {
      channelId: "channel-1",
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderConfigEnable(interaction as never, "guild-1");

    expect(setEnabledMock).toHaveBeenCalledWith("guild-1", true, "channel-1");
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.enable_success",
        },
      ],
      flags: 64,
    });
  });
});
