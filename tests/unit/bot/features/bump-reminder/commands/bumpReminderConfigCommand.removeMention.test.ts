// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeMention.test.ts
import { handleBumpReminderConfigRemoveMention } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeMention";
import { ValidationError } from "@/shared/errors/customErrors";
import { BUMP_REMINDER_MENTION_ROLE_RESULT } from "@/shared/features/bump-reminder/bumpReminderConfigService";

const getBumpReminderConfigMock = vi.fn();
const setMentionRoleMock = vi.fn();

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
    getBumpReminderConfig: (...args: unknown[]) =>
      getBumpReminderConfigMock(...args),
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setMentionRoleMock(...args),
    clearBumpReminderMentionUsers: vi.fn(),
    clearBumpReminderMentions: vi.fn(),
    removeBumpReminderMentionUser: vi.fn(),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((description: string) => ({ description })),
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));

// remove-mention サブコマンドが
// ロール未設定時の ValidationError 送出と設定済みロール削除時の成功応答を
// サービス層の結果コードに応じて正しく分岐するかを検証する
describe("bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeMention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBumpReminderConfigMock.mockResolvedValue({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    });
  });

  it("サービスが NOT_CONFIGURED を返した場合（削除対象のロールが存在しない）は ValidationError を投げることを確認", async () => {
    setMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED,
    );

    const interaction = {
      locale: "ja",
      options: {
        getString: vi.fn(() => "role"),
      },
      reply: vi.fn(),
    };

    await expect(
      handleBumpReminderConfigRemoveMention(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ロールが正常に削除された場合は成功応答を返す", async () => {
    setMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.UPDATED,
    );

    const interaction = {
      locale: "ja",
      options: {
        getString: vi.fn(() => "role"),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderConfigRemoveMention(
      interaction as never,
      "guild-1",
    );

    expect(setMentionRoleMock).toHaveBeenCalledWith("guild-1", undefined);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.remove_mention_role",
        },
      ],
      flags: 64,
    });
  });
});
