// tests/unit/bot/features/bump-reminder/handlers/bumpReminderMemberRemoveHandler.test.ts
import { handleBumpReminderMemberRemove } from "@/features/bump-reminder/handlers/bumpReminderMemberRemoveHandler";

const getBumpReminderSettingsMock = vi.fn();
const removeBumpReminderMentionUserMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    getBumpReminderSettings: (...args: unknown[]) =>
      getBumpReminderSettingsMock(...args),
    removeBumpReminderMentionUser: (...args: unknown[]) =>
      removeBumpReminderMentionUserMock(...args),
  }),
}));

describe("bumpReminderMemberRemoveHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mentionUserIds に含まれるユーザーが退出した場合に除去する", async () => {
    getBumpReminderSettingsMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-1", "user-2"],
    });

    const member = {
      guild: { id: "guild-1" },
      user: { id: "user-1" },
    };

    await handleBumpReminderMemberRemove(member as never);

    expect(removeBumpReminderMentionUserMock).toHaveBeenCalledWith(
      "guild-1",
      "user-1",
    );
  });

  it("mentionUserIds に含まれないユーザーが退出した場合はスキップする", async () => {
    getBumpReminderSettingsMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-2"],
    });

    const member = {
      guild: { id: "guild-1" },
      user: { id: "user-1" },
    };

    await handleBumpReminderMemberRemove(member as never);

    expect(removeBumpReminderMentionUserMock).not.toHaveBeenCalled();
  });

  it("設定が存在しない場合はスキップする", async () => {
    getBumpReminderSettingsMock.mockResolvedValue(null);

    const member = {
      guild: { id: "guild-1" },
      user: { id: "user-1" },
    };

    await handleBumpReminderMemberRemove(member as never);

    expect(removeBumpReminderMentionUserMock).not.toHaveBeenCalled();
  });

  it("user が null の場合はスキップする", async () => {
    const member = {
      guild: { id: "guild-1" },
      user: null,
    };

    await handleBumpReminderMemberRemove(member as never);

    expect(getBumpReminderSettingsMock).not.toHaveBeenCalled();
  });
});
