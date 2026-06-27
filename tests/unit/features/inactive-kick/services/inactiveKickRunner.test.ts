// tests/unit/features/inactive-kick/services/inactiveKickRunner.test.ts

import { ChannelType } from "discord.js";

// vi.mock はホイストされるため、参照する値は vi.hoisted で定義する
const mocks = vi.hoisted(() => ({
  getAllEnabled: vi.fn(),
  updateLastRunDate: vi.fn(),
  disableInvalid: vi.fn(),
  findByGuild: vi.fn(),
  setWarnStage: vi.fn(),
  deleteActivity: vi.fn(),
  sendNotification: vi.fn(),
  env: {
    INACTIVE_KICK_DRY_RUN: false,
    INACTIVE_KICK_CRON_OVERRIDE: undefined as string | undefined,
    INACTIVE_KICK_SKIP_GUARDS: false,
    INACTIVE_KICK_MOCK_MEMBERS: undefined as number | undefined,
  },
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotInactiveKickSettingsService: () => ({
    getAllEnabled: mocks.getAllEnabled,
    updateLastRunDate: mocks.updateLastRunDate,
    disableInvalid: mocks.disableInvalid,
  }),
  getBotMemberActivityRepository: () => ({
    findByGuild: mocks.findByGuild,
    setWarnStage: mocks.setWarnStage,
    deleteActivity: mocks.deleteActivity,
  }),
}));
vi.mock("@/bot/shared/notificationSender", () => ({
  sendNotification: (...args: unknown[]) => mocks.sendNotification(...args),
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
  const channel = {
    type: ChannelType.GuildText,
    send: vi.fn().mockResolvedValue(undefined),
  };
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
  timezone: "Asia/Tokyo",
  runHour: 4,
  mentionEnabled: true,
};

describe("inactive-kick/runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.INACTIVE_KICK_DRY_RUN = false;
    mocks.env.INACTIVE_KICK_CRON_OVERRIDE = undefined;
    mocks.env.INACTIVE_KICK_SKIP_GUARDS = false;
    mocks.env.INACTIVE_KICK_MOCK_MEMBERS = undefined;
    mocks.disableInvalid.mockResolvedValue(undefined);
    mocks.updateLastRunDate.mockResolvedValue(undefined);
    mocks.setWarnStage.mockResolvedValue(undefined);
    mocks.deleteActivity.mockResolvedValue(undefined);
    mocks.sendNotification.mockResolvedValue({ firstMessageSent: true });
    mocks.findByGuild.mockResolvedValue([]);
  });

  it("通知チャンネル未設定なら自動無効化してキックしない", async () => {
    const guild = fakeGuild([fakeMember({ id: "u1" })]);
    await processGuildInactiveKick(fakeClient(guild), {
      ...baseSettings,
      channelId: undefined,
    });
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
    expect(mocks.sendNotification).not.toHaveBeenCalled();
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
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
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
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("INACTIVE_KICK_DRY_RUN ではキックせず通知のみ送る", async () => {
    mocks.env.INACTIVE_KICK_DRY_RUN = true;
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    mocks.findByGuild.mockResolvedValue([
      { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
    ]);

    await processGuildInactiveKick(fakeClient(guild), baseSettings);

    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.deleteActivity).not.toHaveBeenCalled();
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("通知送信失敗時は warnStage を前進させない（H1）", async () => {
    mocks.sendNotification.mockRejectedValueOnce(new Error("send failed"));
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
    it("未設定なら既定（毎時）を返す", () => {
      mocks.env.INACTIVE_KICK_CRON_OVERRIDE = undefined;
      expect(resolveInactiveKickSchedule()).toBe(INACTIVE_KICK_JOB_SCHEDULE);
    });

    it("有効な cron 上書きがあればそれを返す", () => {
      mocks.env.INACTIVE_KICK_CRON_OVERRIDE = "*/5 * * * *";
      expect(resolveInactiveKickSchedule()).toBe("*/5 * * * *");
    });

    it("不正な cron 上書きなら既定にフォールバックする", () => {
      mocks.env.INACTIVE_KICK_CRON_OVERRIDE = "not-a-cron";
      expect(resolveInactiveKickSchedule()).toBe(INACTIVE_KICK_JOB_SCHEDULE);
      expect(mocks.logger.warn).toHaveBeenCalled();
    });
  });

  // 廃止プレースホルダー案内がステージごとに適切なタイミングで送信されるかを検証
  // （OLD = 1970 / warnStage:0 → finalWarn バケット、warnStage:2 → kick バケット）
  // sendNotification は mocks を経由するため channel.send を直接呼ぶのは sendObsoleteInactiveKickNotice のみ
  describe("廃止プレースホルダー案内（ステージ別）", () => {
    it("finalWarn 候補ありかつ finalWarnMessage に廃止プレースホルダーがあれば最終警告後に channel.send が呼ばれる", async () => {
      const member = fakeMember({ id: "u1" });
      const guild = fakeGuild([member]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };
      mocks.findByGuild.mockResolvedValue([
        { userId: "u1", lastActivityAt: OLD, warnStage: 0 },
      ]);

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        finalWarnMessage: "あと {daysLeft} 日でキックされます",
      });

      expect(channel.send).toHaveBeenCalled();
    });

    it("finalWarn 候補ありでも finalWarnMessage に廃止プレースホルダーがなければ案内 Embed の channel.send は呼ばれない", async () => {
      const member = fakeMember({ id: "u1" });
      const guild = fakeGuild([member]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };
      mocks.findByGuild.mockResolvedValue([
        { userId: "u1", lastActivityAt: OLD, warnStage: 0 },
      ]);

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        finalWarnMessage: "{serverName} から最終警告",
      });

      expect(channel.send).not.toHaveBeenCalled();
    });

    it("kick 候補ありかつ kickMessage に廃止プレースホルダーがあればキック後に channel.send が呼ばれる", async () => {
      const member = fakeMember({ id: "u1" });
      const guild = fakeGuild([member]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };
      mocks.findByGuild.mockResolvedValue([
        { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
      ]);

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        kickMessage: "{markerRole} の方がキックされました",
      });

      expect(channel.send).toHaveBeenCalled();
    });

    it("kick 候補ありでも kickMessage に廃止プレースホルダーがなければ案内 Embed の channel.send は呼ばれない", async () => {
      const member = fakeMember({ id: "u1" });
      const guild = fakeGuild([member]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };
      mocks.findByGuild.mockResolvedValue([
        { userId: "u1", lastActivityAt: OLD, warnStage: 2 },
      ]);

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        kickMessage: "{serverName} からキックされました",
      });

      expect(channel.send).not.toHaveBeenCalled();
    });

    it("候補がなければ廃止プレースホルダーがあっても案内 Embed は送信されない", async () => {
      const guild = fakeGuild([]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };
      mocks.findByGuild.mockResolvedValue([]);

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        weekWarnMessage: "{daysLeft}",
        finalWarnMessage: "{daysLeft}",
        kickMessage: "{markerRole}",
      });

      expect(channel.send).not.toHaveBeenCalled();
    });

    it("INACTIVE_KICK_MOCK_MEMBERS 設定時、weekWarnMessage に廃止プレースホルダーがあれば channel.send が呼ばれる", async () => {
      mocks.env.INACTIVE_KICK_MOCK_MEMBERS = 1;
      const guild = fakeGuild([]);
      const channel = (await guild.channels.fetch()) as {
        send: ReturnType<typeof vi.fn>;
      };

      await processGuildInactiveKick(fakeClient(guild), {
        ...baseSettings,
        weekWarnMessage: "あと {daysLeft} 日",
      });

      expect(channel.send).toHaveBeenCalled();
    });
  });
});
