// tests/unit/features/inactive-kick/services/inactiveKickEligibility.test.ts

import {
  classifyStage,
  computeDaysLeft,
  computeEffectiveLastActivity,
  computeInactiveDays,
  computeTenureDays,
  hasActiveCondition,
  INACTIVE_KICK_STAGE,
  isExcluded,
  isMarkerRoleTarget,
  meetsActiveCondition,
  resolveApplicableTier,
  WARN_STAGE,
} from "@/features/inactive-kick/services/inactiveKickEligibility";

const BASE_TIER = {
  trackMessage: true,
  trackVoice: true,
  trackReaction: true,
};

const day = (n: number) => new Date(2026, 0, n, 0, 0, 0);

describe("inactive-kick/eligibility", () => {
  describe("computeEffectiveLastActivity", () => {
    it("活動履歴があればそれを用いる（enabledAt より新しい場合）", () => {
      const result = computeEffectiveLastActivity(day(20), day(1), day(10));
      expect(result).toEqual(day(20));
    });

    it("活動履歴がなければ参加日時を用いる", () => {
      const result = computeEffectiveLastActivity(null, day(15), day(10));
      expect(result).toEqual(day(15));
    });

    it("enabledAt を下限とする（古い活動履歴は enabledAt まで引き上げる）", () => {
      const result = computeEffectiveLastActivity(day(2), day(1), day(10));
      expect(result).toEqual(day(10));
    });

    it("参加日時が enabledAt より古ければ enabledAt を用いる", () => {
      const result = computeEffectiveLastActivity(null, day(1), day(10));
      expect(result).toEqual(day(10));
    });

    it("enabledAt が null なら floor しない", () => {
      const result = computeEffectiveLastActivity(day(2), day(1), null);
      expect(result).toEqual(day(2));
    });
  });

  describe("computeTenureDays", () => {
    it("在籍満日数を返す（enabledAt フロアは適用しない）", () => {
      expect(computeTenureDays(day(1), day(31))).toBe(30);
    });
    it("joinedAt が不明（null）なら 0 を返す", () => {
      expect(computeTenureDays(null, day(31))).toBe(0);
    });
    it("未来時刻でも 0 を下限とする", () => {
      expect(computeTenureDays(day(31), day(1))).toBe(0);
    });
  });

  describe("resolveApplicableTier", () => {
    const tiers = [
      { ...BASE_TIER, tenureDays: 0, thresholdDays: 14 },
      { ...BASE_TIER, tenureDays: 14, thresholdDays: 30 },
      { ...BASE_TIER, tenureDays: 90, thresholdDays: 90 },
    ];

    it("在籍日数を満たす最大 tenureDays の階層を採用する", () => {
      expect(resolveApplicableTier(0, tiers)?.thresholdDays).toBe(14);
      expect(resolveApplicableTier(13, tiers)?.thresholdDays).toBe(14);
      expect(resolveApplicableTier(14, tiers)?.thresholdDays).toBe(30);
      expect(resolveApplicableTier(89, tiers)?.thresholdDays).toBe(30);
      expect(resolveApplicableTier(90, tiers)?.thresholdDays).toBe(90);
      expect(resolveApplicableTier(1000, tiers)?.thresholdDays).toBe(90);
    });

    it("tiers の並び順に依存しない", () => {
      const shuffled = [tiers[2], tiers[0], tiers[1]];
      expect(resolveApplicableTier(50, shuffled)?.thresholdDays).toBe(30);
    });

    it("該当階層が無ければ null を返す（在籍日数が全階層の最小未満）", () => {
      const tiersWithoutBase = [
        { ...BASE_TIER, tenureDays: 30, thresholdDays: 14 },
      ];
      expect(resolveApplicableTier(29, tiersWithoutBase)).toBeNull();
      expect(resolveApplicableTier(30, tiersWithoutBase)?.thresholdDays).toBe(
        14,
      );
    });
  });

  describe("hasActiveCondition / meetsActiveCondition", () => {
    const NO_CONDITION = { ...BASE_TIER, tenureDays: 0, thresholdDays: 30 };
    const WITH_CONDITION = {
      ...BASE_TIER,
      tenureDays: 0,
      thresholdDays: 30,
      minMessageCount: 5,
      minVoiceCount: 3,
    };

    it("min*Count が1つも設定されていなければ false", () => {
      expect(hasActiveCondition(NO_CONDITION)).toBe(false);
    });

    it("min*Count が1つでも設定されていれば true", () => {
      expect(hasActiveCondition(WITH_CONDITION)).toBe(true);
    });

    it("条件未設定の階層は meetsActiveCondition が常に false", () => {
      expect(
        meetsActiveCondition(
          { messageCount: 999, voiceCount: 999, reactionCount: 999 },
          NO_CONDITION,
        ),
      ).toBe(false);
    });

    it("設定した種別のいずれか1つでも下限以上なら true（OR条件）", () => {
      expect(
        meetsActiveCondition(
          { messageCount: 0, voiceCount: 3, reactionCount: 0 },
          WITH_CONDITION,
        ),
      ).toBe(true);
      expect(
        meetsActiveCondition(
          { messageCount: 5, voiceCount: 0, reactionCount: 0 },
          WITH_CONDITION,
        ),
      ).toBe(true);
    });

    it("いずれの種別も下限未満なら false", () => {
      expect(
        meetsActiveCondition(
          { messageCount: 4, voiceCount: 2, reactionCount: 0 },
          WITH_CONDITION,
        ),
      ).toBe(false);
    });
  });

  describe("computeInactiveDays", () => {
    it("満日数を返す", () => {
      expect(computeInactiveDays(day(1), day(31))).toBe(30);
    });
    it("未来時刻でも 0 を下限とする", () => {
      expect(computeInactiveDays(day(31), day(1))).toBe(0);
    });
  });

  describe("computeDaysLeft", () => {
    it("残日数を返す", () => {
      expect(computeDaysLeft(25, 30)).toBe(5);
    });
    it("超過時は 0", () => {
      expect(computeDaysLeft(40, 30)).toBe(0);
    });
  });

  describe("classifyStage（しきい値 30）", () => {
    const T = 30;

    it("しきい値超過 + 最終警告済 → KICK", () => {
      expect(classifyStage(30, T, WARN_STAGE.FINAL)).toBe(
        INACTIVE_KICK_STAGE.KICK,
      );
      expect(classifyStage(35, T, WARN_STAGE.FINAL)).toBe(
        INACTIVE_KICK_STAGE.KICK,
      );
    });

    it("最終警告済み・しきい値未到達 → PENDING_KICK（ロール維持・通知なし）", () => {
      // T-3 〜 T-1 の範囲で warnStage=2（最終警告送信済み）
      expect(classifyStage(27, T, WARN_STAGE.FINAL)).toBe(
        INACTIVE_KICK_STAGE.PENDING_KICK,
      );
      expect(classifyStage(29, T, WARN_STAGE.FINAL)).toBe(
        INACTIVE_KICK_STAGE.PENDING_KICK,
      );
    });

    it("しきい値超過でも最終警告未送信なら FINAL_WARN（警告ゲート）", () => {
      expect(classifyStage(30, T, WARN_STAGE.WEEK)).toBe(
        INACTIVE_KICK_STAGE.FINAL_WARN,
      );
      expect(classifyStage(40, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.FINAL_WARN,
      );
    });

    it("T-3 以上 + 最終警告未送信 → FINAL_WARN", () => {
      expect(classifyStage(27, T, WARN_STAGE.WEEK)).toBe(
        INACTIVE_KICK_STAGE.FINAL_WARN,
      );
      expect(classifyStage(28, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.FINAL_WARN,
      );
    });

    it("T-7 以上 T-3 未満 + 未通知 → WEEK_WARN", () => {
      expect(classifyStage(23, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.WEEK_WARN,
      );
      expect(classifyStage(26, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.WEEK_WARN,
      );
    });

    it("1 週間前通知済（warnStage>=1）なら同区間で再通知しない", () => {
      expect(classifyStage(24, T, WARN_STAGE.WEEK)).toBe(
        INACTIVE_KICK_STAGE.NONE,
      );
    });

    it("しきい値に達していなければ NONE", () => {
      expect(classifyStage(10, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.NONE,
      );
      expect(classifyStage(22, T, WARN_STAGE.NONE)).toBe(
        INACTIVE_KICK_STAGE.NONE,
      );
    });
  });

  describe("isMarkerRoleTarget", () => {
    it("T-7 以上で true", () => {
      expect(isMarkerRoleTarget(23, 30)).toBe(true);
      expect(isMarkerRoleTarget(30, 30)).toBe(true);
    });
    it("T-7 未満で false", () => {
      expect(isMarkerRoleTarget(22, 30)).toBe(false);
    });
  });

  describe("isExcluded", () => {
    const base = {
      isBot: false,
      isOwner: false,
      isAdministrator: false,
      inVoice: false,
      userId: "user-1",
      memberRoleIds: ["role-a"],
      whitelistRoleIds: [] as string[],
      whitelistUserIds: [] as string[],
    };

    it("通常メンバーは除外しない", () => {
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
    it("VC 接続中は除外", () => {
      expect(isExcluded({ ...base, inVoice: true })).toBe(true);
    });
    it("ホワイトリストユーザーは除外", () => {
      expect(isExcluded({ ...base, whitelistUserIds: ["user-1"] })).toBe(true);
    });
    it("ホワイトリストロール保持者は除外", () => {
      expect(isExcluded({ ...base, whitelistRoleIds: ["role-a"] })).toBe(true);
    });
    it("ホワイトリストロール非保持なら除外しない", () => {
      expect(isExcluded({ ...base, whitelistRoleIds: ["role-x"] })).toBe(false);
    });
  });
});
