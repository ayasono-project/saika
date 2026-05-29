// tests/unit/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.view.test.ts
import { handleBumpReminderSettingsView } from "@/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.view";

const getBumpReminderSettingsMock = vi.fn();
const createInfoEmbedMock = vi.fn((description: string) => ({
  description,
  kind: "info",
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
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    getBumpReminderSettings: (...args: unknown[]) =>
      getBumpReminderSettingsMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (description: string) => createInfoEmbedMock(description),
}));

describe("bot/features/bump-reminder/commands/bumpReminderSettingsCommand.view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が null の場合は未設定状態を示す embed を返す", async () => {
    getBumpReminderSettingsMock.mockResolvedValueOnce(null);
    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:embed.description.not_configured",
          kind: "info",
        },
      ],
      flags: 64,
    });
  });

  it("設定が存在する場合は設定済み内容を示す embed を返す", async () => {
    getBumpReminderSettingsMock.mockResolvedValueOnce({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    });
    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsView(interaction as never, "guild-1");

    expect(createInfoEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "", kind: "info" }],
      flags: 64,
    });
  });
});
