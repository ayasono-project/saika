import { ValidationError } from "@ayasono/shared/core";
import { BUMP_REMINDER_MENTION_ROLE_RESULT } from "@/features/bump-reminder/bumpReminderSettingsService";
import { handleBumpReminderSettingsRemoveMention } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.removeMention";

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
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setMentionRoleMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));

// remove-mention サブコマンドが
// ロール未設定時の ValidationError 送出と設定済みロール削除時の成功応答を
// サービス層の結果コードに応じて正しく分岐するかを検証する
describe("bot/features/bump-reminder/commands/bumpReminderSettingsCommand.removeMention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サービスが NOT_CONFIGURED を返した場合（削除対象のロールが存在しない）は ValidationError を投げることを確認", async () => {
    setMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED,
    );

    const interaction = {
      locale: "ja",
      reply: vi.fn(),
    };

    await expect(
      handleBumpReminderSettingsRemoveMention(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ロールが正常に削除された場合は成功応答を返す", async () => {
    setMentionRoleMock.mockResolvedValue(
      BUMP_REMINDER_MENTION_ROLE_RESULT.UPDATED,
    );

    const interaction = {
      locale: "ja",
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsRemoveMention(
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
