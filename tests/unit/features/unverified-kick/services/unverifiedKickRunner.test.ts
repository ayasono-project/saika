// tests/unit/features/unverified-kick/services/unverifiedKickRunner.test.ts

import { ChannelType, PermissionFlagsBits } from "discord.js";

// vi.mock はホイストされるため、参照する値は vi.hoisted で定義する
const mocks = vi.hoisted(() => ({
  getAllEnabled: vi.fn(),
  disableInvalid: vi.fn(),
  sendPaginatedEmbeds: vi.fn(),
  env: {
    TEST_MODE: false,
    UNVERIFIED_KICK_CRON: undefined as string | undefined,
  },
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotUnverifiedKickSettingsService: () => ({
    getAllEnabled: mocks.getAllEnabled,
    disableInvalid: mocks.disableInvalid,
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
  processGuildUnverifiedKick,
  resolveUnverifiedKickSchedule,
  runUnverifiedKickDailyCheck,
  UNVERIFIED_KICK_JOB_SCHEDULE,
} from "@/features/unverified-kick/services/unverifiedKickRunner";

const OLD = new Date(0); // 1970 → ageDays は常に猶予超過
const VERIFIED = "verified-role";
const MARKER = "marker-role";

interface FakeMemberOpts {
  id: string;
  bot?: boolean;
  admin?: boolean;
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
    send: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeGuild(
  members: ReturnType<typeof fakeMember>[],
  opts: { botCanKick?: boolean; verifiedRoleExists?: boolean } = {},
) {
  const map = new Map(members.map((m) => [m.id, m]));
  const channel = {
    type: ChannelType.GuildText,
    permissionsFor: () => ({ has: () => true }),
    send: vi.fn().mockResolvedValue(undefined),
  };
  const me = {
    permissions: {
      has: (p: unknown) =>
        p === PermissionFlagsBits.KickMembers
          ? (opts.botCanKick ?? true)
          : true,
    },
  };
  return {
    id: "g1",
    name: "Guild",
    ownerId: "owner",
    members: {
      me,
      fetch: vi.fn((id?: string) =>
        Promise.resolve(id === undefined ? map : map.get(id)),
      ),
    },
    channels: { fetch: vi.fn(() => Promise.resolve(channel)) },
    roles: {
      fetch: vi.fn(() =>
        Promise.resolve(
          (opts.verifiedRoleExists ?? true)
            ? { id: VERIFIED, name: "一般" }
            : null,
        ),
      ),
    },
    _channel: channel,
  };
}

function fakeClient(guild: ReturnType<typeof fakeGuild>) {
  return { guilds: { cache: new Map([[guild.id, guild]]) } } as never;
}

const baseSettings = {
  guildId: "g1",
  enabled: true,
  enabledAt: OLD,
  verifiedRoleId: VERIFIED,
  graceDays: 7,
  warnDays: undefined as number | undefined,
  notifyChannelId: "chan-notify",
  logChannelId: "chan-log",
  markerRoleId: undefined as string | undefined,
  dmTemplate: undefined as string | undefined,
  notifyTemplate: undefined as string | undefined,
  exemptRoleIds: [] as string[],
};

describe("unverified-kick/runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.TEST_MODE = false;
    mocks.env.UNVERIFIED_KICK_CRON = undefined;
    mocks.disableInvalid.mockResolvedValue(undefined);
    mocks.sendPaginatedEmbeds.mockResolvedValue(undefined);
  });

  it("認証ロール未設定なら自動無効化してキックしない", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), {
      ...baseSettings,
      verifiedRoleId: undefined,
    });
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
    expect(member.kick).not.toHaveBeenCalled();
  });

  it("認証ロールが削除済みなら自動無効化する", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member], { verifiedRoleExists: false });
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
  });

  it("Bot に KickMembers 権限がなければ自動無効化する", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member], { botCanKick: false });
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(mocks.disableInvalid).toHaveBeenCalledWith("g1");
  });

  it("猶予超過の未承認メンバーをキックし、ログサマリーを送る", async () => {
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(member.kick).toHaveBeenCalledTimes(1);
    // ログチャンネルへキックサマリー
    expect(mocks.sendPaginatedEmbeds).toHaveBeenCalledTimes(1);
  });

  it("認証済みメンバーはキックしない", async () => {
    const member = fakeMember({ id: "u1", roles: [VERIFIED] });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(member.kick).not.toHaveBeenCalled();
  });

  it("TEST_MODE ではキックせずログのみ送る", async () => {
    mocks.env.TEST_MODE = true;
    const member = fakeMember({ id: "u1" });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.sendPaginatedEmbeds).toHaveBeenCalledTimes(1);
  });

  it("キック不能メンバーはスキップする", async () => {
    const member = fakeMember({ id: "u1", kickable: false });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), baseSettings);
    expect(member.kick).not.toHaveBeenCalled();
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it("対象ロール保持の認証済みメンバーから対象ロールを剥奪する（保険クリーンアップ）", async () => {
    const member = fakeMember({ id: "u1", roles: [VERIFIED, MARKER] });
    const guild = fakeGuild([member]);
    await processGuildUnverifiedKick(fakeClient(guild), {
      ...baseSettings,
      markerRoleId: MARKER,
    });
    expect(member.roles.remove).toHaveBeenCalledWith(MARKER);
    expect(member.kick).not.toHaveBeenCalled();
  });

  it("runUnverifiedKickDailyCheck は有効ギルドを処理し例外を隔離する", async () => {
    mocks.getAllEnabled.mockResolvedValue([baseSettings]);
    const guild = fakeGuild([fakeMember({ id: "u1" })]);
    await runUnverifiedKickDailyCheck(fakeClient(guild));
    expect(mocks.logger.info).toHaveBeenCalled();
  });

  describe("resolveUnverifiedKickSchedule", () => {
    it("未設定なら既定（毎日03:00）を返す", () => {
      mocks.env.UNVERIFIED_KICK_CRON = undefined;
      expect(resolveUnverifiedKickSchedule()).toBe(
        UNVERIFIED_KICK_JOB_SCHEDULE,
      );
    });
    it("有効な cron 上書きがあればそれを返す", () => {
      mocks.env.UNVERIFIED_KICK_CRON = "*/5 * * * *";
      expect(resolveUnverifiedKickSchedule()).toBe("*/5 * * * *");
    });
    it("不正な cron 上書きなら既定にフォールバックする", () => {
      mocks.env.UNVERIFIED_KICK_CRON = "not-a-cron";
      expect(resolveUnverifiedKickSchedule()).toBe(
        UNVERIFIED_KICK_JOB_SCHEDULE,
      );
      expect(mocks.logger.warn).toHaveBeenCalled();
    });
  });
});
