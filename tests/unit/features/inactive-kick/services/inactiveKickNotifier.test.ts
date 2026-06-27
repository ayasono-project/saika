// tests/unit/features/inactive-kick/services/inactiveKickNotifier.test.ts

import type { CategorizedCandidate } from "@/features/inactive-kick/services/inactiveKickCandidates";
import {
  buildKickNotification,
  buildWarnNotification,
  formatInactiveKickMessage,
} from "@/features/inactive-kick/services/inactiveKickNotifier";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

// キック予定日算出の基準時刻（固定）
const NOW = new Date(2026, 0, 10, 12, 0, 0);

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

const baseCtx = {
  t,
  serverName: "彩園",
  thresholdDays: 30,
  now: NOW,
  defaultMessageKey: "inactiveKick:default.week_warn_message" as const,
  timezone: "Asia/Tokyo",
  runHour: 4,
  mentionEnabled: false,
};

describe("inactive-kick/notifier", () => {
  describe("formatInactiveKickMessage", () => {
    it("単一波括弧プレースホルダーを置換する", () => {
      const result = formatInactiveKickMessage(
        "{serverName} で {count} 名が対象",
        { serverName: "彩園", count: 3 },
      );
      expect(result).toBe("彩園 で 3 名が対象");
    });

    it("未知のプレースホルダーはそのまま残す", () => {
      expect(formatInactiveKickMessage("{unknown}", { count: 1 })).toBe(
        "{unknown}",
      );
    });
  });

  describe("buildWarnNotification", () => {
    it("カスタム文を本文(content)に出し、count と thresholdDays を差し込む", () => {
      const candidates = [
        candidate({ userId: "u1", daysLeft: 3 }),
        candidate({ userId: "u2", daysLeft: 1 }),
      ];
      const { content, embeds } = buildWarnNotification(candidates, {
        ...baseCtx,
        customMessage: "{count}名・しきい値{thresholdDays}日",
      });
      // daysLeft が異なる 2 グループ → 2 Embed
      expect(embeds).toHaveLength(2);
      expect(content).toBe("2名・しきい値30日");
      expect(embeds[0]?.data.description).toBeUndefined();
    });

    it("mentionEnabled:true なら全対象メンションを本文末尾に追加する", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
        mentionEnabled: true,
        customMessage: "警告",
      });
      expect(content).toBe("警告\n<@u1>");
    });

    it("対象メンバーフィールドとキック予定日タイムスタンプを Embed に出す", () => {
      const { embeds } = buildWarnNotification(
        [candidate({ userId: "u1", daysLeft: 2 })],
        {
          ...baseCtx,
          customMessage: "msg",
        },
      );
      const fields = embeds[0]?.data.fields ?? [];
      // schedule フィールドと member フィールドが存在する
      expect(fields.length).toBeGreaterThanOrEqual(2);
      const memberField = fields.find((f) => f.value.includes("<@u1>"));
      expect(memberField).toBeDefined();
      const scheduleField = fields.find((f) => f.value.startsWith("<t:"));
      expect(scheduleField?.value).toMatch(/^<t:\d+:f>$/);
    });

    it("カスタム未設定なら defaultMessageKey のデフォルト文を本文に使う", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
      });
      // t はキー文字列をそのまま返すため、指定したデフォルトキーが使われたと分かる
      expect(content).toBe("inactiveKick:default.week_warn_message");
    });

    it("同一 daysLeft のグループは 1 Embed にまとまる", () => {
      const many = Array.from({ length: 5 }, (_, i) =>
        candidate({ userId: `u${i}`, daysLeft: 3 }),
      );
      const { embeds } = buildWarnNotification(many, {
        ...baseCtx,
        customMessage: "msg",
      });
      expect(embeds).toHaveLength(1);
    });
  });

  describe("buildKickNotification", () => {
    it("表示名と userId を 'displayName (`userId`)' 形式で Embed に列挙する", () => {
      const { embeds } = buildKickNotification(
        [
          { displayName: "Alice", userId: "u1" },
          { displayName: "Bob", userId: "u2" },
        ],
        { t, serverName: "s", thresholdDays: 30, testMode: false },
      );
      expect(embeds[0]?.data.fields?.[0]?.value).toBe(
        "Alice (`u1`), Bob (`u2`)",
      );
    });

    it("カスタム文があれば本文に出す", () => {
      const { content } = buildKickNotification(
        [{ displayName: "A", userId: "u1" }],
        {
          t,
          serverName: "s",
          thresholdDays: 30,
          customMessage: "{count}名キック",
          testMode: false,
        },
      );
      expect(content).toBe("1名キック");
    });

    it("カスタム未設定なら content は undefined", () => {
      const { content } = buildKickNotification(
        [{ displayName: "A", userId: "u1" }],
        { t, serverName: "s", thresholdDays: 30, testMode: false },
      );
      expect(content).toBeUndefined();
    });

    it("テストモードでは注記フィールドを追加する", () => {
      const normal = buildKickNotification(
        [{ displayName: "A", userId: "u1" }],
        { t, serverName: "s", thresholdDays: 30, testMode: false },
      );
      const test = buildKickNotification([{ displayName: "A", userId: "u1" }], {
        t,
        serverName: "s",
        thresholdDays: 30,
        testMode: true,
      });
      expect(normal.embeds[0]?.data.fields).toHaveLength(1);
      expect(test.embeds[0]?.data.fields).toHaveLength(2);
    });
  });
});
