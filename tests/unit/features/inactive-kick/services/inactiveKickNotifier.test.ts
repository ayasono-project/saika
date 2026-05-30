// tests/unit/features/inactive-kick/services/inactiveKickNotifier.test.ts

import type { CategorizedCandidate } from "@/features/inactive-kick/services/inactiveKickCandidates";
import {
  buildKickNotification,
  buildWarnNotification,
  formatInactiveKickMessage,
  NOTIFICATION_PAGE_SIZE,
} from "@/features/inactive-kick/services/inactiveKickNotifier";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

// キック予定日算出の基準時刻（固定）
const NOW = new Date(2026, 0, 10, 12, 0, 0);
/** 現在から days 日後の Discord 日付タイムスタンプ */
const expectedKickTimestamp = (days: number) =>
  `<t:${Math.floor((NOW.getTime() + days * 24 * 60 * 60 * 1000) / 1000)}:D>`;

function candidate(
  over: Partial<CategorizedCandidate> & { userId: string },
): CategorizedCandidate {
  return {
    displayName: `name-${over.userId}`,
    inactiveDays: 30,
    daysLeft: 3,
    warnStage: 0,
    isMarkerTarget: true,
    hasMarkerRole: false,
    ...over,
  };
}

describe("inactive-kick/notifier", () => {
  describe("formatInactiveKickMessage", () => {
    it("単一波括弧プレースホルダーを置換する", () => {
      const result = formatInactiveKickMessage(
        "{serverName} で {count} 名が {daysLeft} 日後",
        { serverName: "彩園", count: 3, daysLeft: 2 },
      );
      expect(result).toBe("彩園 で 3 名が 2 日後");
    });

    it("未知のプレースホルダーはそのまま残す", () => {
      expect(formatInactiveKickMessage("{unknown}", { count: 1 })).toBe(
        "{unknown}",
      );
    });
  });

  describe("buildWarnNotification", () => {
    it("カスタム文を本文(content)に出し、count と最小 daysLeft を差し込む", () => {
      const candidates = [
        candidate({ userId: "u1", daysLeft: 3 }),
        candidate({ userId: "u2", daysLeft: 1 }),
      ];
      const { content, embeds } = buildWarnNotification(candidates, {
        t,
        serverName: "彩園",
        thresholdDays: 30,
        now: NOW,
        customMessage: "{count}名・あと{daysLeft}日",
        defaultMessageKey: "inactiveKick:default.week_warn_message",
      });
      expect(embeds).toHaveLength(1);
      // カスタム文は本文へ（embed description には入れない）。最小 daysLeft（1）が代表値
      expect(content).toBe("2名・あと1日");
      expect(embeds[0].data.description).toBeUndefined();
    });

    it("{markerRole} は本文に含めたときだけメンションへ置換される", () => {
      const withMarker = buildWarnNotification([candidate({ userId: "u1" })], {
        t,
        serverName: "s",
        thresholdDays: 30,
        now: NOW,
        customMessage: "{markerRole} 警告",
        defaultMessageKey: "inactiveKick:default.week_warn_message",
        markerRoleId: "role-1",
      });
      expect(withMarker.content).toBe("<@&role-1> 警告");

      // 本文に {markerRole} を含めなければメンションは入らない
      const withoutMarker = buildWarnNotification(
        [candidate({ userId: "u1" })],
        {
          t,
          serverName: "s",
          thresholdDays: 30,
          now: NOW,
          customMessage: "警告のみ",
          defaultMessageKey: "inactiveKick:default.week_warn_message",
          markerRoleId: "role-1",
        },
      );
      expect(withoutMarker.content).toBe("警告のみ");
    });

    it("対象メンバーを列挙し、キック予定日を推定日付タイムスタンプで出す", () => {
      const { embeds } = buildWarnNotification(
        [candidate({ userId: "u1", daysLeft: 2 })],
        {
          t,
          serverName: "s",
          thresholdDays: 30,
          now: NOW,
          customMessage: "msg",
          defaultMessageKey: "inactiveKick:default.week_warn_message",
        },
      );
      expect(embeds[0].data.fields?.[0].value).toBe("<@u1>");
      // 最小 daysLeft（2）後の Discord 日付タイムスタンプ
      expect(embeds[0].data.fields?.[1].value).toBe(expectedKickTimestamp(2));
    });

    it("カスタム未設定なら defaultMessageKey のデフォルト文を本文に使う", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        t,
        serverName: "s",
        thresholdDays: 30,
        now: NOW,
        defaultMessageKey: "inactiveKick:default.final_warn_message",
      });
      // t はキー文字列をそのまま返すため、指定したデフォルトキーが使われたと分かる
      expect(content).toBe("inactiveKick:default.final_warn_message");
    });

    it("ページサイズを超えると Embed が複数ページに分割される", () => {
      const many = Array.from({ length: NOTIFICATION_PAGE_SIZE + 1 }, (_, i) =>
        candidate({ userId: `u${i}` }),
      );
      const { embeds } = buildWarnNotification(many, {
        t,
        serverName: "s",
        thresholdDays: 30,
        now: NOW,
        customMessage: "msg",
        defaultMessageKey: "inactiveKick:default.week_warn_message",
      });
      expect(embeds).toHaveLength(2);
    });
  });

  describe("buildKickNotification", () => {
    it("カスタム文を本文に出し、控えた表示名を Embed に列挙する", () => {
      const { content, embeds } = buildKickNotification(["Alice", "Bob"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "{count}名キック",
        testMode: false,
      });
      expect(content).toBe("2名キック");
      expect(embeds[0].data.description).toBeUndefined();
      expect(embeds[0].data.fields?.[0].value).toBe("Alice\nBob");
    });

    it("カスタム未設定なら本文を出さない（content は undefined・Embed のみ）", () => {
      const { content, embeds } = buildKickNotification(["A"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        testMode: false,
      });
      expect(content).toBeUndefined();
      expect(embeds[0].data.fields?.[0].value).toBe("A");
    });

    it("テストモードでは注記フィールドを追加する", () => {
      const normal = buildKickNotification(["A"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
        testMode: false,
      });
      const test = buildKickNotification(["A"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
        testMode: true,
      });
      expect(normal.embeds[0].data.fields).toHaveLength(1);
      expect(test.embeds[0].data.fields).toHaveLength(2);
    });
  });
});
