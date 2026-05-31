// tests/unit/features/unverified-kick/services/unverifiedKickCandidates.test.ts

import {
  type CandidateMemberInput,
  type CandidateSettings,
  categorizeCandidates,
} from "@/features/unverified-kick/services/unverifiedKickCandidates";

const day = (n: number) => new Date(2026, 0, n, 0, 0, 0);
const NOW = day(31);

function member(
  over: Partial<CandidateMemberInput> & { userId: string },
): CandidateMemberInput {
  return {
    isBot: false,
    isOwner: false,
    isAdministrator: false,
    isVerified: false,
    memberRoleIds: [],
    joinedAt: day(1),
    hasMarkerRole: false,
    ...over,
  };
}

const settings: CandidateSettings = {
  graceDays: 7,
  warnDays: 5,
  enabledAt: null,
  exemptRoleIds: [],
};

describe("unverified-kick/candidates", () => {
  it("猶予超過の未承認メンバーは kick バケットへ", () => {
    // joinedAt=day(1), now=day(31) → 30 日経過 >= 7
    const buckets = categorizeCandidates(
      [member({ userId: "u1" })],
      settings,
      NOW,
    );
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.warn).toHaveLength(0);
  });

  it("ちょうど warnDays 経過のメンバーは warn バケットへ", () => {
    // ageDays == 5 になるよう joinedAt を day(26) に
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(26) })],
      settings,
      NOW,
    );
    expect(buckets.warn.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick).toHaveLength(0);
  });

  it("除外メンバー（認証済み）は対象外、対象ロール保持なら markerCleanup へ", () => {
    const buckets = categorizeCandidates(
      [member({ userId: "u1", isVerified: true, hasMarkerRole: true })],
      settings,
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.warn).toHaveLength(0);
    expect(buckets.markerCleanup).toEqual(["u1"]);
  });

  it("除外メンバーで対象ロール未保持なら markerCleanup に積まない", () => {
    const buckets = categorizeCandidates(
      [member({ userId: "u1", isVerified: true, hasMarkerRole: false })],
      settings,
      NOW,
    );
    expect(buckets.markerCleanup).toHaveLength(0);
  });

  it("enabledAt 起算下限: 有効化前から猶予超過でも有効化直後はキックされない", () => {
    // joinedAt は大昔だが enabledAt=now なので ageDays=0
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(1) })],
      { ...settings, enabledAt: NOW },
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.warn).toHaveLength(0);
  });

  it("warnDays 未設定なら warn バケットは生成されない（キックは成立）", () => {
    const noWarn: CandidateSettings = { ...settings, warnDays: undefined };
    const warnAged = member({ userId: "u-warn", joinedAt: day(26) }); // 5日
    const kickAged = member({ userId: "u-kick", joinedAt: day(1) }); // 30日
    const buckets = categorizeCandidates([warnAged, kickAged], noWarn, NOW);
    expect(buckets.warn).toHaveLength(0);
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u-kick"]);
  });

  it("Bot は常に除外される", () => {
    const buckets = categorizeCandidates(
      [member({ userId: "bot", isBot: true })],
      settings,
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.markerCleanup).toHaveLength(0);
  });
});
