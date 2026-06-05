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
    warnedAt: null,
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
  it("猶予超過でも未警告なら warn（飛び越え救済・繰り延べ）", () => {
    // joinedAt=day(1), now=day(31) → 30 日経過 >= 7。ただし未警告のため即キックしない
    const buckets = categorizeCandidates(
      [member({ userId: "u1" })],
      settings,
      NOW,
    );
    expect(buckets.warn.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick).toHaveLength(0);
  });

  it("猶予超過で警告済み・通知猶予を満たせば kick バケットへ", () => {
    // age30 >= 7、warnedAt=day(20) → 警告から 11 日経過 >= 通知猶予 2
    const buckets = categorizeCandidates(
      [member({ userId: "u1", warnedAt: day(20) })],
      settings,
      NOW,
    );
    expect(buckets.kick.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.warn).toHaveLength(0);
  });

  it("猶予超過で警告済みでも通知猶予が未経過なら待機（kick も warn もしない）", () => {
    // age30 >= 7、warnedAt=day(30) → 警告から 1 日 < 通知猶予 2
    const buckets = categorizeCandidates(
      [member({ userId: "u1", warnedAt: day(30) })],
      settings,
      NOW,
    );
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.warn).toHaveLength(0);
  });

  it("警告ウィンドウ内で未警告のメンバーは warn バケットへ", () => {
    // ageDays == 5 になるよう joinedAt を day(26) に
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(26) })],
      settings,
      NOW,
    );
    expect(buckets.warn.map((c) => c.userId)).toEqual(["u1"]);
    expect(buckets.kick).toHaveLength(0);
    // warn の残日数は通知猶予（graceDays - warnDays = 2）
    expect(buckets.warn[0]?.remainingDays).toBe(2);
  });

  it("警告ウィンドウ内で警告済みなら再警告しない（NONE）", () => {
    // joinedAt=day(25) → age6（ウィンドウ内）、warnedAt=day(30) → 警告済み
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(25), warnedAt: day(30) })],
      settings,
      NOW,
    );
    expect(buckets.warn).toHaveLength(0);
    expect(buckets.kick).toHaveLength(0);
    expect(buckets.clearWarn).toHaveLength(0);
  });

  it("起算リセット（再参加等）で ageDays が warnDays 未満に戻った警告記録は clearWarn へ", () => {
    // joinedAt=day(30) → age1 < warnDays、warnedAt=day(10) が残存 → 失効
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(30), warnedAt: day(10) })],
      settings,
      NOW,
    );
    expect(buckets.clearWarn).toEqual(["u1"]);
    expect(buckets.warn).toHaveLength(0);
    expect(buckets.kick).toHaveLength(0);
  });

  it("認証済みになった警告記録は clearWarn へ（markerCleanup と独立）", () => {
    const buckets = categorizeCandidates(
      [member({ userId: "u1", isVerified: true, warnedAt: day(20) })],
      settings,
      NOW,
    );
    expect(buckets.clearWarn).toEqual(["u1"]);
    expect(buckets.markerCleanup).toHaveLength(0);
  });

  it("警告無効化（warnDays 未設定）後に残った警告記録は clearWarn へ", () => {
    const noWarn: CandidateSettings = { ...settings, warnDays: undefined };
    // joinedAt=day(28) → age3 < grace でキック対象外。警告記録のみ失効させる
    const buckets = categorizeCandidates(
      [member({ userId: "u1", joinedAt: day(28), warnedAt: day(20) })],
      noWarn,
      NOW,
    );
    expect(buckets.clearWarn).toEqual(["u1"]);
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
