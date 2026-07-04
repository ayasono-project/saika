// tests/unit/features/inactive-kick/services/inactiveKickCandidates.test.ts

import {
  type CandidateActivity,
  type CandidateMemberInput,
  categorizeCandidates,
} from "@/features/inactive-kick/services/inactiveKickCandidates";
import { WARN_STAGE } from "@/features/inactive-kick/services/inactiveKickEligibility";

const NOW = new Date(2026, 1, 1); // 2026-02-01
const day = (n: number) => new Date(2026, 0, n); // 2026-01-n

const BASE_TIER = {
  trackMessage: true,
  trackVoice: true,
  trackReaction: true,
};

const SETTINGS = {
  tiers: [{ ...BASE_TIER, tenureDays: 0, thresholdDays: 30 }],
  enabledAt: day(1),
  whitelistRoleIds: [] as string[],
  whitelistUserIds: [] as string[],
};

function activity(
  over: Partial<CandidateActivity> & {
    lastActivityAt: Date | null;
    warnStage: number;
  },
): CandidateActivity {
  return {
    messageCount: 0,
    voiceCount: 0,
    reactionCount: 0,
    ...over,
  };
}

function member(
  over: Partial<CandidateMemberInput> & { userId: string },
): CandidateMemberInput {
  return {
    displayName: `name-${over.userId}`,
    isBot: false,
    isOwner: false,
    isAdministrator: false,
    inVoice: false,
    memberRoleIds: [],
    joinedAt: day(1),
    hasMarkerRole: false,
    ...over,
  };
}

describe("inactive-kick/categorizeCandidates", () => {
  it("最終警告済 + しきい値超過 → kick バケット + markerRoleTargetIds に含まれる", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL })],
    ]);
    // 1/1 起算で 2/1 は 31 日 → しきい値 30 超過
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick[0]?.tenureDeadline).toBe(false);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.markerRoleTargetIds.has("u1")).toBe(true);
  });

  it("しきい値超過でも最終警告未送信なら finalWarn（警告ゲート）", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.NONE })],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.finalWarn.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("活動履歴なしは joinedAt 起算(enabledAt で floor)", () => {
    const members = [member({ userId: "u1", joinedAt: day(1) })];
    const activities = new Map<string, CandidateActivity>();
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    // 31 日経過・warnStage 0 → finalWarn
    expect(buckets.finalWarn.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("1 週間前段階のメンバーは weekWarn かつ isMarkerTarget=true + markerRoleTargetIds に含まれる", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(8), warnStage: WARN_STAGE.NONE })],
    ]);
    // 1/8 起算で 2/1 は 24 日 → T-7(23)以上 T-3(27)未満 → weekWarn
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.weekWarn.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.weekWarn[0].isMarkerTarget).toBe(true);
    expect(buckets.markerRoleTargetIds.has("u1")).toBe(true);
  });

  it("活動中（しきい値未満）のメンバーはどのバケットにも入らない", () => {
    // day(28) → inactiveDays=4 < T-7(23) → 警告ウィンドウ外
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(28), warnStage: WARN_STAGE.NONE })],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.weekWarn).toHaveLength(0);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.pendingKick).toHaveLength(0);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.markerRoleTargetIds.size).toBe(0);
  });

  it("最終警告済み・しきい値未到達 → pendingKick バケット + markerRoleTargetIds に含まれる", () => {
    // T=30, enabledAt=day(1), NOW=2/1(day31)
    // lastActivityAt=day(5) → inactiveDays=27(T-3), warnStage=2 → PENDING_KICK
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(5), warnStage: WARN_STAGE.FINAL })],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.pendingKick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.markerRoleTargetIds.has("u1")).toBe(true);
  });

  it("1週間前警告済み（warnStage=1）の dead zone → バケットなし・markerRoleTargetIds には含まれる", () => {
    // lastActivityAt=day(8) → inactiveDays=24 (T-7=23 以上・T-3=27 未満)
    // warnStage=WEEK(1) → classifyStage=NONE（week dead zone）
    // ただし isMarkerRoleTarget(24, 30)=true → markerRoleTargetIds に入るべき
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(8), warnStage: WARN_STAGE.WEEK })],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.weekWarn).toHaveLength(0);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.pendingKick).toHaveLength(0);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.markerRoleTargetIds.has("u1")).toBe(true);
  });

  it("除外メンバー（管理者）はキックされず、警告進行があれば graceClear に入る", () => {
    const members = [member({ userId: "admin", isAdministrator: true })];
    const activities = new Map<string, CandidateActivity>([
      [
        "admin",
        activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }),
      ],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.graceClear.map((g) => g.userId)).toEqual(["admin"]);
  });

  it("除外メンバーで対象ロール付与済みなら graceClear（warnStage 0 でも）", () => {
    const members = [
      member({ userId: "u1", inVoice: true, hasMarkerRole: true }),
    ];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.NONE })],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.graceClear).toEqual([{ userId: "u1", hasMarkerRole: true }]);
  });

  it("除外メンバーで警告も対象ロールも無ければ graceClear に入らない", () => {
    const members = [member({ userId: "bot", isBot: true })];
    const activities = new Map<string, CandidateActivity>();
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.graceClear).toHaveLength(0);
  });

  it("ホワイトリストロール保持者は除外される", () => {
    const settings = { ...SETTINGS, whitelistRoleIds: ["vip"] };
    const members = [member({ userId: "u1", memberRoleIds: ["vip"] })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL })],
    ]);
    const buckets = categorizeCandidates(members, activities, settings, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.graceClear.map((g) => g.userId)).toEqual(["u1"]);
  });
});

describe("inactive-kick/categorizeCandidates（在籍階層）", () => {
  const TIER_SETTINGS = {
    tiers: [
      { ...BASE_TIER, tenureDays: 0, thresholdDays: 14 },
      { ...BASE_TIER, tenureDays: 90, thresholdDays: 60 },
    ],
    enabledAt: day(1),
    whitelistRoleIds: [] as string[],
    whitelistUserIds: [] as string[],
  };

  it("在籍日数に応じて異なる階層のしきい値が適用される", () => {
    const members = [
      member({ userId: "new", joinedAt: day(25) }), // 在籍 7 日 → 新規階層（しきい値 14 日）
      member({ userId: "old", joinedAt: new Date(2025, 0, 1) }), // 在籍 396 日 → 古参階層（しきい値 60 日）
    ];
    const activities = new Map<string, CandidateActivity>([
      [
        "new",
        activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }),
      ],
      [
        "old",
        activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }),
      ],
    ]);
    const buckets = categorizeCandidates(
      members,
      activities,
      TIER_SETTINGS,
      NOW,
    );
    // new: 非アクティブ 31 日 >= しきい値 14 日 → kick
    expect(buckets.kick.map((c) => c.userId)).toEqual(["new"]);
    // old: 非アクティブ 31 日 < しきい値 60 日 → 対象外
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.weekWarn).toHaveLength(0);
  });

  it("在籍日数が全階層の最小 tenureDays 未満なら対象外（バケット・markerRoleTargetIds いずれにも含まれない）", () => {
    const tiersWithoutBaseTier = {
      tiers: [{ ...BASE_TIER, tenureDays: 30, thresholdDays: 14 }],
      enabledAt: day(1),
      whitelistRoleIds: [] as string[],
      whitelistUserIds: [] as string[],
    };
    const members = [member({ userId: "u1", joinedAt: day(25) })]; // 在籍 7 日 < 30 日
    const activities = new Map<string, CandidateActivity>([
      ["u1", activity({ lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL })],
    ]);
    const buckets = categorizeCandidates(
      members,
      activities,
      tiersWithoutBaseTier,
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.markerRoleTargetIds.size).toBe(0);
  });
});

describe("inactive-kick/categorizeCandidates（アクティブ条件）", () => {
  it("累積回数が下限未満なら通常通りキック対象になる", () => {
    const settings = {
      tiers: [
        { ...BASE_TIER, tenureDays: 0, thresholdDays: 30, minMessageCount: 5 },
      ],
      enabledAt: day(1),
      whitelistRoleIds: [] as string[],
      whitelistUserIds: [] as string[],
    };
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      [
        "u1",
        activity({
          lastActivityAt: day(1),
          warnStage: WARN_STAGE.FINAL,
          messageCount: 4,
        }),
      ],
    ]);
    const buckets = categorizeCandidates(members, activities, settings, NOW);
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("累積回数が下限以上なら graceClear 扱いになり、キックされない", () => {
    const settings = {
      tiers: [
        { ...BASE_TIER, tenureDays: 0, thresholdDays: 30, minMessageCount: 5 },
      ],
      enabledAt: day(1),
      whitelistRoleIds: [] as string[],
      whitelistUserIds: [] as string[],
    };
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      [
        "u1",
        activity({
          lastActivityAt: day(1),
          warnStage: WARN_STAGE.FINAL,
          messageCount: 5,
        }),
      ],
    ]);
    const buckets = categorizeCandidates(members, activities, settings, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.graceClear.map((g) => g.userId)).toEqual(["u1"]);
  });

  it("アクティブ条件未設定の階層では回数に関わらず影響しない", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      [
        "u1",
        activity({
          lastActivityAt: day(1),
          warnStage: WARN_STAGE.FINAL,
          messageCount: 999,
        }),
      ],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
  });
});

describe("inactive-kick/categorizeCandidates（tenureDeadline モード）", () => {
  const DEADLINE_SETTINGS = {
    tiers: [
      {
        ...BASE_TIER,
        tenureDays: 0,
        thresholdDays: 30,
        tenureDeadline: true,
        minMessageCount: 3,
      },
    ],
    enabledAt: day(1),
    whitelistRoleIds: [] as string[],
    whitelistUserIds: [] as string[],
  };

  it("アクティブ条件未達のまま在籍日数がしきい値に到達すればキックされる", () => {
    // 在籍 31 日（joinedAt=day(1)・NOW=2/1）でアクティブ条件（3件）未達
    const members = [member({ userId: "u1", joinedAt: day(1) })];
    const activities = new Map<string, CandidateActivity>([
      [
        "u1",
        activity({
          lastActivityAt: day(1),
          warnStage: WARN_STAGE.FINAL,
          messageCount: 2,
        }),
      ],
    ]);
    const buckets = categorizeCandidates(
      members,
      activities,
      DEADLINE_SETTINGS,
      NOW,
    );
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick[0]?.tenureDeadline).toBe(true);
  });

  it("アクティブ条件を満たしていれば在籍日数がしきい値を超えても恒久的に除外される", () => {
    const members = [member({ userId: "u1", joinedAt: day(1) })];
    const activities = new Map<string, CandidateActivity>([
      [
        "u1",
        activity({
          lastActivityAt: day(1),
          warnStage: WARN_STAGE.FINAL,
          messageCount: 3,
        }),
      ],
    ]);
    const buckets = categorizeCandidates(
      members,
      activities,
      DEADLINE_SETTINGS,
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.graceClear.map((g) => g.userId)).toEqual(["u1"]);
  });
});
