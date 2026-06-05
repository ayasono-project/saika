// tests/unit/features/unverified-kick/services/unverifiedKickEligibility.test.ts

import {
  classifyStage,
  computeAgeDays,
  computeEffectiveJoinedAt,
  computeRemainingDays,
  computeWarnedDaysAgo,
  isExcluded,
  UNVERIFIED_KICK_STAGE,
} from "@/features/unverified-kick/services/unverifiedKickEligibility";

const day = (n: number) => new Date(2026, 0, n, 0, 0, 0);

describe("unverified-kick/eligibility", () => {
  describe("computeEffectiveJoinedAt", () => {
    it("参加日時が enabledAt より新しければ参加日時を用いる", () => {
      expect(computeEffectiveJoinedAt(day(20), day(10))).toEqual(day(20));
    });

    it("参加日時が enabledAt より古ければ enabledAt を下限とする", () => {
      expect(computeEffectiveJoinedAt(day(2), day(10))).toEqual(day(10));
    });

    it("参加日時が無ければ enabledAt を用いる", () => {
      expect(computeEffectiveJoinedAt(null, day(10))).toEqual(day(10));
    });

    it("enabledAt が null なら floor しない", () => {
      expect(computeEffectiveJoinedAt(day(2), null)).toEqual(day(2));
    });
  });

  describe("computeAgeDays", () => {
    it("満日数を返す", () => {
      expect(computeAgeDays(day(1), day(8))).toBe(7);
    });
    it("未来時刻でも 0 を下限とする", () => {
      expect(computeAgeDays(day(8), day(1))).toBe(0);
    });
  });

  describe("computeRemainingDays", () => {
    it("残日数を返す", () => {
      expect(computeRemainingDays(5, 7)).toBe(2);
    });
    it("超過時は 0", () => {
      expect(computeRemainingDays(10, 7)).toBe(0);
    });
  });

  describe("computeWarnedDaysAgo", () => {
    it("未警告（null）なら null", () => {
      expect(computeWarnedDaysAgo(null, day(31))).toBeNull();
    });
    it("警告からの満日数を返す", () => {
      expect(computeWarnedDaysAgo(day(5), day(8))).toBe(3);
    });
    it("未来時刻でも 0 を下限とする", () => {
      expect(computeWarnedDaysAgo(day(8), day(5))).toBe(0);
    });
  });

  describe("classifyStage（猶予 7・警告 5・通知猶予 2）", () => {
    const G = 7;
    const W = 5;

    it("警告ウィンドウ内で未警告 → WARN（ちょうど・途中いずれも）", () => {
      expect(classifyStage(5, G, W, null)).toBe(UNVERIFIED_KICK_STAGE.WARN);
      // 警告日を飛び越えてもウィンドウ内なら警告される（旧: イコール比較で漏れていた）
      expect(classifyStage(6, G, W, null)).toBe(UNVERIFIED_KICK_STAGE.WARN);
    });

    it("警告ウィンドウ内で警告済み → NONE（再警告しない）", () => {
      expect(classifyStage(6, G, W, 1)).toBe(UNVERIFIED_KICK_STAGE.NONE);
    });

    it("warnDays 未満は NONE", () => {
      expect(classifyStage(4, G, W, null)).toBe(UNVERIFIED_KICK_STAGE.NONE);
    });

    it("猶予到達で未警告 → WARN（飛び越え救済・繰り延べ）", () => {
      expect(classifyStage(7, G, W, null)).toBe(UNVERIFIED_KICK_STAGE.WARN);
      expect(classifyStage(10, G, W, null)).toBe(UNVERIFIED_KICK_STAGE.WARN);
    });

    it("猶予到達で警告済みかつ通知猶予を満たす → KICK", () => {
      expect(classifyStage(7, G, W, 2)).toBe(UNVERIFIED_KICK_STAGE.KICK);
      expect(classifyStage(9, G, W, 4)).toBe(UNVERIFIED_KICK_STAGE.KICK);
    });

    it("猶予到達でも通知猶予が未経過なら待機（NONE・サイレントキック防止）", () => {
      expect(classifyStage(7, G, W, 1)).toBe(UNVERIFIED_KICK_STAGE.NONE);
      expect(classifyStage(8, G, W, 0)).toBe(UNVERIFIED_KICK_STAGE.NONE);
    });

    it("warnDays が null（警告無効）なら WARN にならず猶予到達で即 KICK", () => {
      expect(classifyStage(5, G, null, null)).toBe(UNVERIFIED_KICK_STAGE.NONE);
      expect(classifyStage(7, G, null, null)).toBe(UNVERIFIED_KICK_STAGE.KICK);
    });
  });

  describe("isExcluded", () => {
    const base = {
      isBot: false,
      isOwner: false,
      isAdministrator: false,
      isVerified: false,
      memberRoleIds: ["role-a"],
      exemptRoleIds: [] as string[],
    };

    it("通常の未承認メンバーは除外しない", () => {
      expect(isExcluded(base)).toBe(false);
    });
    it("Bot は除外", () => {
      expect(isExcluded({ ...base, isBot: true })).toBe(true);
    });
    it("オーナーは除外", () => {
      expect(isExcluded({ ...base, isOwner: true })).toBe(true);
    });
    it("Administrator は除外", () => {
      expect(isExcluded({ ...base, isAdministrator: true })).toBe(true);
    });
    it("認証済み（認証ロール保持）は除外", () => {
      expect(isExcluded({ ...base, isVerified: true })).toBe(true);
    });
    it("除外ロール保持者は除外", () => {
      expect(isExcluded({ ...base, exemptRoleIds: ["role-a"] })).toBe(true);
    });
    it("除外ロール非保持なら除外しない", () => {
      expect(isExcluded({ ...base, exemptRoleIds: ["role-x"] })).toBe(false);
    });
  });
});
