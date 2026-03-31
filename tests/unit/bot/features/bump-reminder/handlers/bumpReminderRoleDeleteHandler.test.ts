// tests/unit/bot/features/bump-reminder/handlers/bumpReminderRoleDeleteHandler.test.ts
import { handleBumpReminderRoleDelete } from "@/bot/features/bump-reminder/handlers/bumpReminderRoleDeleteHandler";

const getBumpReminderConfigMock = vi.fn();
const setBumpReminderMentionRoleMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderConfigService: () => ({
    getBumpReminderConfig: (...args: unknown[]) =>
      getBumpReminderConfigMock(...args),
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setBumpReminderMentionRoleMock(...args),
  }),
}));

describe("bumpReminderRoleDeleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mentionRoleId と一致するロールが削除された場合にクリアする", async () => {
    getBumpReminderConfigMock.mockResolvedValue({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: [],
    });

    const role = {
      id: "role-1",
      guild: { id: "guild-1" },
    };

    await handleBumpReminderRoleDelete(role as never);

    expect(setBumpReminderMentionRoleMock).toHaveBeenCalledWith(
      "guild-1",
      undefined,
    );
  });

  it("mentionRoleId と一致しないロールが削除された場合はスキップする", async () => {
    getBumpReminderConfigMock.mockResolvedValue({
      enabled: true,
      mentionRoleId: "role-1",
      mentionUserIds: [],
    });

    const role = {
      id: "role-2",
      guild: { id: "guild-1" },
    };

    await handleBumpReminderRoleDelete(role as never);

    expect(setBumpReminderMentionRoleMock).not.toHaveBeenCalled();
  });

  it("設定が存在しない場合はスキップする", async () => {
    getBumpReminderConfigMock.mockResolvedValue(null);

    const role = {
      id: "role-1",
      guild: { id: "guild-1" },
    };

    await handleBumpReminderRoleDelete(role as never);

    expect(setBumpReminderMentionRoleMock).not.toHaveBeenCalled();
  });

  it("エラー発生時はクラッシュせずログ出力する", async () => {
    getBumpReminderConfigMock.mockRejectedValue(new Error("DB error"));
    const { logger } = await import("@/shared/utils/logger");

    const role = {
      id: "role-1",
      guild: { id: "guild-1" },
    };

    await handleBumpReminderRoleDelete(role as never);

    expect(logger.error).toHaveBeenCalled();
  });
});
