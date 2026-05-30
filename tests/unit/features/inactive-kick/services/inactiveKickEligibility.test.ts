// tests/unit/features/inactive-kick/services/inactiveKickEligibility.test.ts

import {
  classifyStage,
  computeDaysLeft,
  computeEffectiveLastActivity,
  computeInactiveDays,
  INACTIVE_KICK_STAGE,
  isExcluded,
  isMarkerRoleTarget,
  WARN_STAGE,
} from "@/features/inactive-kick/services/inactiveKickEligibility";

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
