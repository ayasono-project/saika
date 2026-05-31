// tests/unit/features/unverified-kick/services/unverifiedKickEligibility.test.ts

import {
  classifyStage,
  computeAgeDays,
  computeEffectiveJoinedAt,
  computeRemainingDays,
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

  describe("classifyStage（猶予 7・警告 5）", () => {
    const G = 7;
    const W = 5;

    it("猶予超過 → KICK", () => {
      expect(classifyStage(7, G, W)).toBe(UNVERIFIED_KICK_STAGE.KICK);
      expect(classifyStage(10, G, W)).toBe(UNVERIFIED_KICK_STAGE.KICK);
    });

    it("ちょうど warnDays の日 → WARN", () => {
      expect(classifyStage(5, G, W)).toBe(UNVERIFIED_KICK_STAGE.WARN);
    });

    it("warnDays 前後（ちょうどでない）は NONE", () => {
      expect(classifyStage(4, G, W)).toBe(UNVERIFIED_KICK_STAGE.NONE);
      expect(classifyStage(6, G, W)).toBe(UNVERIFIED_KICK_STAGE.NONE);
    });

    it("warnDays が null なら WARN にならない", () => {
      expect(classifyStage(5, G, null)).toBe(UNVERIFIED_KICK_STAGE.NONE);
      // キックは warnDays に関係なく成立する
      expect(classifyStage(7, G, null)).toBe(UNVERIFIED_KICK_STAGE.KICK);
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
