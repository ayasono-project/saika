// tests/unit/features/inactive-kick/services/inactiveKickCandidates.test.ts

import {
  type CandidateActivity,
  type CandidateMemberInput,
  categorizeCandidates,
} from "@/features/inactive-kick/services/inactiveKickCandidates";
import { WARN_STAGE } from "@/features/inactive-kick/services/inactiveKickEligibility";

const NOW = new Date(2026, 1, 1); // 2026-02-01
const day = (n: number) => new Date(2026, 0, n); // 2026-01-n

const SETTINGS = {
  thresholdDays: 30,
  enabledAt: day(1),
  whitelistRoleIds: [] as string[],
  whitelistUserIds: [] as string[],
};

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
  it("最終警告済 + しきい値超過 → kick バケット", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", { lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }],
    ]);
    // 1/1 起算で 2/1 は 31 日 → しきい値 30 超過
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.finalWarn).toHaveLength(0);
  });

  it("しきい値超過でも最終警告未送信なら finalWarn（警告ゲート）", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", { lastActivityAt: day(1), warnStage: WARN_STAGE.NONE }],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.finalWarn.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("活動履歴なしは joinedAt 起算（enabledAt で floor）", () => {
    const members = [member({ userId: "u1", joinedAt: day(1) })];
    const activities = new Map<string, CandidateActivity>();
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    // 31 日経過・warnStage 0 → finalWarn
    expect(buckets.finalWarn.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("1 週間前段階のメンバーは weekWarn かつ isMarkerTarget=true", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", { lastActivityAt: day(8), warnStage: WARN_STAGE.NONE }],
    ]);
    // 1/8 起算で 2/1 は 24 日 → T-7(23)以上 T-3(27)未満 → weekWarn
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.weekWarn.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.weekWarn[0].isMarkerTarget).toBe(true);
  });

  it("活動中（しきい値未満）のメンバーはどのバケットにも入らない", () => {
    const members = [member({ userId: "u1" })];
    const activities = new Map<string, CandidateActivity>([
      ["u1", { lastActivityAt: day(28), warnStage: WARN_STAGE.NONE }],
    ]);
    const buckets = categorizeCandidates(members, activities, SETTINGS, NOW);
    expect(buckets.weekWarn).toHaveLength(0);
    expect(buckets.finalWarn).toHaveLength(0);
    expect(buckets.kick).toHaveLength(0);
  });

  it("除外メンバー（管理者）はキックされず、警告進行があれば graceClear に入る", () => {
    const members = [member({ userId: "admin", isAdministrator: true })];
    const activities = new Map<string, CandidateActivity>([
      ["admin", { lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }],
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
      ["u1", { lastActivityAt: day(1), warnStage: WARN_STAGE.NONE }],
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
      ["u1", { lastActivityAt: day(1), warnStage: WARN_STAGE.FINAL }],
    ]);
    const buckets = categorizeCandidates(members, activities, settings, NOW);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.graceClear.map((g) => g.userId)).toEqual(["u1"]);
  });
});
