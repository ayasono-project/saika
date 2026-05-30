// tests/unit/features/inactive-kick/services/inactiveKickRunner.test.ts

import { ChannelType } from "discord.js";

// vi.mock はホイストされるため、参照する値は vi.hoisted で定義する
const mocks = vi.hoisted(() => ({
  getAllEnabled: vi.fn(),
  disableInvalid: vi.fn(),
  findByGuild: vi.fn(),
  setWarnStage: vi.fn(),
  deleteActivity: vi.fn(),
  sendPaginatedEmbeds: vi.fn(),
  env: {
    TEST_MODE: false,
    INACTIVE_KICK_CRON: undefined as string | undefined,
  },
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotInactiveKickSettingsService: () => ({
    getAllEnabled: mocks.getAllEnabled,
    disableInvalid: mocks.disableInvalid,
  }),
  getBotMemberActivityRepository: () => ({
    findByGuild: mocks.findByGuild,
    setWarnStage: mocks.setWarnStage,
    deleteActivity: mocks.deleteActivity,
  }),
}));
vi.mock("@/bot/shared/embedPaginator", () => ({
  sendPaginatedEmbeds: (...args: unknown[]) =>
    mocks.sendPaginatedEmbeds(...args),
}));
vi.mock("@/shared/config/env", () => ({ env: mocks.env }));
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: async () => (key: string) => key,
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
}));
vi.mock("@/shared/utils/logger", () => ({ logger: mocks.logger }));

import {
  INACTIVE_KICK_JOB_SCHEDULE,
  processGuildInactiveKick,
  resolveInactiveKickSchedule,
  runInactiveKickDailyCheck,
} from "@/features/inactive-kick/services/inactiveKickRunner";

const OLD = new Date(0); // 1970 → inactiveDays は常にしきい値超過

interface FakeMemberOpts {
  id: string;
  bot?: boolean;
  admin?: boolean;
  inVoice?: boolean;
  roles?: string[];
  kickable?: boolean;
}

function fakeMember(opts: FakeMemberOpts) {
  const roleSet = new Set(opts.roles ?? []);
  return {
    id: opts.id,
    displayName: `name-${opts.id}`,
    user: { bot: opts.bot ?? false },
    permissions: { has: () => opts.admin ?? false },
    voice: { channelId: opts.inVoice ? "vc" : null },
    roles: {
      cache: {
        keys: () => roleSet.values(),
        has: (r: string) => roleSet.has(r),
      },
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    joinedAt: OLD,
    kickable: opts.kickable ?? true,
    kick: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeGuild(members: ReturnType<typeof fakeMember>[]) {
  const map = new Map(members.map((m) => [m.id, m]));
  const channel = { type: ChannelType.GuildText, send: vi.fn() };
  return {
    id: "g1",
    name: "Guild",
    ownerId: "owner",
    members: {
      fetch: vi.fn((id?: string) =>
        Promise.resolve(id === undefined ? map : map.get(id)),
      ),
    },
    channels: { fetch: vi.fn(() => Promise.resolve(channel)) },
  };
}

function fakeClient(guild: ReturnType<typeof fakeGuild>) {
  return { guilds: { cache: new Map([[guild.id, guild]]) } } as never;
}

const baseSettings = {
  guildId: "g1",
  enabled: true,
  enabledAt: OLD,
  channelId: "chan-1",
  thresholdDays: 30,
  weekWarnMessage: undefined,
  finalWarnMessage: undefined,
  kickMessage: undefined,
  markerRoleId: undefined,
  whitelistRoleIds: [] as string[],
  whitelistUserIds: [] as string[],
};

describe("inactive-kick/runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.TEST_MODE = false;
    mocks.env.INACTIVE_KICK_CRON = undefined;
    mocks.disableInvalid.mockResolvedValue(undefined);
    mocks.setWarnStage.mockResolvedValue(undefined);
    mocks.deleteActivity.mockResolvedValue(undefined);
    mocks.sendPaginatedEmbeds.mockResolvedValue(undefined);
    mocks.findByGuild.mockResolvedValue([]);
  });

  it("通知チャンネル未設定なら自動無効化してキックしない", async () => {
    const guild = fakeGuild([fakeMember({ id: "u1" })]);
    await processGuildInactiveKick(fakeClient(guild), {
      ...baseSettings,
      channelId: undefined,
    });
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
    expect(mocks.sendPaginatedEmbeds).not.toHaveBeenCalled();
  });

  it("しきい値が範囲外なら自動無効化する", async () => {
    const guild = fakeGuild([fakeMember({ id: "u1" })]);
    await processGuildInactiveKick(fakeClient(guild), {
      ...baseSettings,
      thresholdDays: 5,
    });
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
  });

  it("警告ゲート: 最終警告未送信ならキックせず最終警告を送り warnStage=2 に前進", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 0 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    // キックされない
    expect(member.kick).not.toHaveBeenCalled();
    // 最終警告通知が送信され warnStage=2 に前進
    expect(mocks.sendPaginatedEmbeds).toHaveBeenCalledTimes(1);
    expect(mocks.setWarnStage).toHaveBeenCalledWith("g1", "u1", 2);
  });

  it("最終警告済 + しきい値超過ならキックし、活動履歴を削除する", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).toHaveBeenCalledTimes(1);
    expect(mocks.deleteActivity).toHaveBeenCalledWith("g1", "u1");
    // キック通知が送信される
    expect(mocks.sendPaginatedEmbeds).toHaveBeenCalledTimes(1);
  });

  it("TEST_MODE ではキックせず通知のみ送る", async () => {
    mocks.env.TEST_MODE = true;
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.deleteActivity).not.toHaveBeenCalled();
    expect(mocks.sendPaginatedEmbeds).toHaveBeenCalledTimes(1);
  });

  it("通知送信失敗時は warnStage を前進させない（H1）", async () => {
    mocks.sendPaginatedEmbeds.mockRejectedValueOnce(new Error("send failed"));
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 0 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.setWarnStage).not.toHaveBeenCalled();
  });

  it("除外メンバー（管理者）で警告進行があれば warnStage を 0 にリセットする", async () => {
    const member = fakeMember({ id: "admin", admin: true });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "admin", lastActivityAt: OLD, warnStage: 2 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.setWarnStage).toHaveBeenCalledWith("g1", "admin", 0);
  });

  it("キック不能メンバーはスキップしてキックしない", async () => {
    const member = fakeMember({ id: "u1", kickable: false });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it("runInactiveKickDailyCheck は有効ギルドを順に処理し、例外を隔離する", async () => {
    mocks.getAllEnabled.mockResolvedValue([{ ...baseSettings, guildId: "g1" }]);
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([]);

    await runInactiveKickDailyCheck(fakeClient(guild));

    expect(mocks.logger.info).toHaveBeenCalled();
  });

  describe("resolveInactiveKickSchedule", () => {
    it("未設定なら既定（毎日04:00）を返す", () => {
      mocks.env.INACTIVE_KICK_CRON = undefined;
      expect(resolveInactiveKickSchedule()).toBe(INACTIVE_KICK_JOB_SCHEDULE);
    });

    it("有効な cron 上書きがあればそれを返す", () => {
      mocks.env.INACTIVE_KICK_CRON = "*/5 * * * *";
      expect(resolveInactiveKickSchedule()).toBe("*/5 * * * *");
    });

    it("不正な cron 上書きなら既定にフォールバックする", () => {
      mocks.env.INACTIVE_KICK_CRON = "not-a-cron";
      expect(resolveInactiveKickSchedule()).toBe(INACTIVE_KICK_JOB_SCHEDULE);
      expect(mocks.logger.warn).toHaveBeenCalled();
    });
  });
});
