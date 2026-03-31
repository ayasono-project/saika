// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.view.test.ts
import { handleBumpReminderConfigView } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.view";

const getBumpReminderConfigMock = vi.fn();
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
  getBotBumpReminderConfigService: () => ({
    getBumpReminderConfig: (...args: unknown[]) =>
      getBumpReminderConfigMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (description: string) => createInfoEmbedMock(description),
}));

describe("bot/features/bump-reminder/commands/bumpReminderConfigCommand.view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が null の場合は未設定状態を示す embed を返す", async () => {
    getBumpReminderConfigMock.mockResolvedValueOnce(null);
    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderConfigView(interaction as never, "guild-1");

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
    getBumpReminderConfigMock.mockResolvedValueOnce({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    });
    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderConfigView(interaction as never, "guild-1");

    expect(createInfoEmbedMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "", kind: "info" }],
      flags: 64,
    });
  });
});
