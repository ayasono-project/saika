// tests/unit/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.setMention.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { BUMP_REMINDER_MENTION_ROLE_RESULT } from "@/features/bump-reminder/bumpReminderSettingsService";
import { handleBumpReminderSettingsSetMention } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.setMention";

const setBumpReminderMentionRoleMock = vi.fn();

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
  getBotBumpReminderSettingsService: () => ({
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setBumpReminderMentionRoleMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));

describe("bot/features/bump-reminder/commands/bumpReminderSettingsCommand.setMention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setBumpReminderMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.UPDATED,
    );
  });

  it("ロールが正常に設定された場合は成功応答を返す", async () => {
    const interaction = {
      locale: "ja",
      options: {
        getRole: vi.fn(() => ({ id: "role-1" })),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsSetMention(interaction as never, "guild-1");

    expect(setBumpReminderMentionRoleMock).toHaveBeenCalledWith(
      "guild-1",
      "role-1",
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.set_mention_role_success",
        },
      ],
      flags: 64,
    });
  });

  it("サービスが NOT_CONFIGURED を返した場合は ValidationError をスローする", async () => {
    setBumpReminderMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED,
    );

    const interaction = {
      locale: "ja",
      options: {
        getRole: vi.fn(() => ({ id: "role-1" })),
      },
      reply: vi.fn(),
    };

    await expect(
      handleBumpReminderSettingsSetMention(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
