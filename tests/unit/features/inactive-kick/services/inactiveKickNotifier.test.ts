// tests/unit/features/inactive-kick/services/inactiveKickNotifier.test.ts

import type { CategorizedCandidate } from "@/features/inactive-kick/services/inactiveKickCandidates";
import {
  buildKickEmbedPages,
  buildWarnEmbedPages,
  formatInactiveKickMessage,
  NOTIFICATION_PAGE_SIZE,
} from "@/features/inactive-kick/services/inactiveKickNotifier";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

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

  describe("buildWarnEmbedPages", () => {
    it("カスタムメッセージに count と最小 daysLeft を差し込む", () => {
      const candidates = [
        candidate({ userId: "u1", daysLeft: 3 }),
        candidate({ userId: "u2", daysLeft: 1 }),
      ];
      const pages = buildWarnEmbedPages(candidates, {
        t,
        serverName: "彩園",
        thresholdDays: 30,
        customMessage: "{count}名・あと{daysLeft}日",
      });
      expect(pages).toHaveLength(1);
      // 最小 daysLeft（1）が代表値
      expect(pages[0].data.description).toBe("2名・あと1日");
    });

    it("対象メンバーをメンションで列挙する", () => {
      const pages = buildWarnEmbedPages([candidate({ userId: "u1" })], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
      });
      const targetField = pages[0].data.fields?.[0];
      expect(targetField?.value).toBe("<@u1>");
    });

    it("daysLeft が 0 のとき soon キーを使う", () => {
      const pages = buildWarnEmbedPages(
        [candidate({ userId: "u1", daysLeft: 0 })],
        { t, serverName: "s", thresholdDays: 30, customMessage: "msg" },
      );
      const scheduleField = pages[0].data.fields?.[1];
      expect(scheduleField?.value).toBe("inactiveKick:embed.field.value.soon");
    });

    it("ページサイズを超えると複数ページに分割する", () => {
      const many = Array.from({ length: NOTIFICATION_PAGE_SIZE + 1 }, (_, i) =>
        candidate({ userId: `u${i}` }),
      );
      const pages = buildWarnEmbedPages(many, {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
      });
      expect(pages).toHaveLength(2);
    });
  });

  describe("buildKickEmbedPages", () => {
    it("控えた表示名を列挙する", () => {
      const pages = buildKickEmbedPages(["Alice", "Bob"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "{count}名キック",
        testMode: false,
      });
      expect(pages[0].data.description).toBe("2名キック");
      expect(pages[0].data.fields?.[0].value).toBe("Alice\nBob");
    });

    it("テストモードでは注記フィールドを追加する", () => {
      const normal = buildKickEmbedPages(["A"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
        testMode: false,
      });
      const test = buildKickEmbedPages(["A"], {
        t,
        serverName: "s",
        thresholdDays: 30,
        customMessage: "msg",
        testMode: true,
      });
      expect(normal[0].data.fields).toHaveLength(1);
      expect(test[0].data.fields).toHaveLength(2);
    });
  });
});
