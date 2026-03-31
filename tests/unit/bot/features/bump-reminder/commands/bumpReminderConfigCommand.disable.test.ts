// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.disable.test.ts
import { handleBumpReminderConfigDisable } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.disable";

const cancelReminderMock = vi.fn();
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
  getBotBumpReminderManager: () => ({
    cancelReminder: (...args: unknown[]) => cancelReminderMock(...args),
  }),
  getBotBumpReminderConfigService: () => ({
    setBumpReminderEnabled: (...args: unknown[]) => setEnabledMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
}));

describe("bot/features/bump-reminder/commands/bumpReminderConfigCommand.disable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelReminderMock.mockResolvedValue(undefined);
    setEnabledMock.mockResolvedValue(undefined);
  });

  it("リマインダーをキャンセルし、設定を無効化して成功応答を返す", async () => {
    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderConfigDisable(interaction as never, "guild-1");

    expect(cancelReminderMock).toHaveBeenCalledWith("guild-1");
    expect(setEnabledMock).toHaveBeenCalledWith("guild-1", false);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.disable_success",
        },
      ],
      flags: 64,
    });
  });
});
