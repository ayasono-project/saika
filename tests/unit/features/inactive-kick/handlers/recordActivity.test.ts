// tests/unit/features/inactive-kick/handlers/recordActivity.test.ts

// vi.mock はホイストされるため、ファクトリから参照する値は vi.hoisted で定義する
const mocks = vi.hoisted(() => ({
  getActivity: vi.fn(),
  recordActivity: vi.fn(),
  getSettings: vi.fn(),
  tGuild: vi.fn((key: string) => key),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberActivityRepository: () => ({
    getActivity: mocks.getActivity,
    recordActivity: mocks.recordActivity,
  }),
  getBotInactiveKickSettingsService: () => ({
    getSettings: mocks.getSettings,
  }),
}));
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: async (_guildId: string) => mocks.tGuild,
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
}));
vi.mock("@/shared/utils/logger", () => ({ logger: mocks.logger }));

import {
  clearActivityThrottleCache,
  recordMemberActivity,
} from "@/features/inactive-kick/handlers/recordActivity";

const GUILD_ID = "guild-1";
const USER_ID = "user-1";

/** 対象ロールを保持/非保持で切り替えられるフェイクメンバーを生成する */
function createFakeMember(roleIds: string[]) {
  const remove = vi.fn().mockResolvedValue(undefined);
  return {
    member: {
      roles: {
        cache: { has: (id: string) => roleIds.includes(id) },
        remove,
      },
    },
    remove,
  };
}

function createFakeGuild() {
  return { id: GUILD_ID } as never;
}

describe("inactive-kick/recordMemberActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearActivityThrottleCache();
    mocks.getActivity.mockResolvedValue(null);
    mocks.recordActivity.mockResolvedValue(undefined);
    mocks.getSettings.mockResolvedValue(null);
  });

  it("初回活動で lastActivityAt を記録する（警告履歴なし→warnStage は更新せず）", async () => {
    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);

    expect(mocks.recordActivity).toHaveBeenCalledTimes(1);
    const [guildId, userId, , warnStage] = mocks.recordActivity.mock.calls[0];
    expect(guildId).toBe(GUILD_ID);
    expect(userId).toBe(USER_ID);
    // 警告履歴がないため warnStage は更新しない（undefined）
    expect(warnStage).toBeUndefined();
  });

  it("throttle: 直近に書き込み済みなら2回目はスキップする", async () => {
    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);
    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);

    expect(mocks.recordActivity).toHaveBeenCalledTimes(1);
  });

  it("警告済み(warnStage>0)の再活動で warnStage を 0 にリセットする", async () => {
    mocks.getActivity.mockResolvedValue({
      guildId: GUILD_ID,
      userId: USER_ID,
      lastActivityAt: new Date(0),
      warnStage: 2,
    });

    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);

    const [, , , warnStage] = mocks.recordActivity.mock.calls[0];
    expect(warnStage).toBe(0);
  });

  it("警告済みで対象ロール付与済みなら剥奪する", async () => {
    const MARKER = "marker-role";
    mocks.getActivity.mockResolvedValue({
      guildId: GUILD_ID,
      userId: USER_ID,
      lastActivityAt: new Date(0),
      warnStage: 1,
    });
    mocks.getSettings.mockResolvedValue({ markerRoleId: MARKER });
    const { member, remove } = createFakeMember([MARKER]);

    await recordMemberActivity(
      createFakeGuild(),
      USER_ID,
      async () => member as never,
    );

    expect(remove).toHaveBeenCalledWith(
      MARKER,
      "inactiveKick:audit_reason.reactivated",
    );
  });

  it("対象ロール未付与なら剥奪しない", async () => {
    const MARKER = "marker-role";
    mocks.getActivity.mockResolvedValue({
      guildId: GUILD_ID,
      userId: USER_ID,
      lastActivityAt: new Date(0),
      warnStage: 1,
    });
    mocks.getSettings.mockResolvedValue({ markerRoleId: MARKER });
    const { member, remove } = createFakeMember([]);

    await recordMemberActivity(
      createFakeGuild(),
      USER_ID,
      async () => member as never,
    );

    expect(remove).not.toHaveBeenCalled();
  });

  it("未警告(warnStage=0)では対象ロール解決もロール剥奪も行わない", async () => {
    mocks.getActivity.mockResolvedValue({
      guildId: GUILD_ID,
      userId: USER_ID,
      lastActivityAt: new Date(0),
      warnStage: 0,
    });
    const resolveMember = vi.fn(async () => null);

    await recordMemberActivity(createFakeGuild(), USER_ID, resolveMember);

    expect(resolveMember).not.toHaveBeenCalled();
    expect(mocks.getSettings).not.toHaveBeenCalled();
  });

  it("書き込み失敗時は throttle キャッシュを戻し、次回再試行できる", async () => {
    mocks.recordActivity.mockRejectedValueOnce(new Error("db down"));

    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);
    expect(mocks.logger.error).toHaveBeenCalledTimes(1);

    // 次回は throttle されず再試行される
    await recordMemberActivity(createFakeGuild(), USER_ID, async () => null);
    expect(mocks.recordActivity).toHaveBeenCalledTimes(2);
  });
});
