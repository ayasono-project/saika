// tests/unit/features/unverified-kick/services/unverifiedKickNotifier.test.ts

import type {
  CandidateBuckets,
  CategorizedCandidate,
} from "@/features/unverified-kick/services/unverifiedKickCandidates";
import {
  buildDmMessage,
  buildKickNotification,
  buildPreviewEmbedPages,
  buildWarnNotification,
  formatUnverifiedKickMessage,
} from "@/features/unverified-kick/services/unverifiedKickNotifier";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

const NOW = new Date(2026, 0, 10, 12, 0, 0);

function candidate(
  over: Partial<CategorizedCandidate> & { userId: string },
): CategorizedCandidate {
  return {
    ageDays: 5,
    remainingDays: 2,
    hasMarkerRole: false,
    ...over,
  };
}

const baseCtx = {
  t,
  now: NOW,
  serverName: "彩園",
  graceDays: 7,
  warnDays: 5,
  timezone: "Asia/Tokyo",
  runHour: 3,
  mentionEnabled: false,
};

describe("unverified-kick/notifier", () => {
  describe("formatUnverifiedKickMessage", () => {
    it("単一波括弧プレースホルダーを置換する", () => {
      expect(
        formatUnverifiedKickMessage("{serverName} あと {remainingDays} 日", {
          serverName: "彩園",
          remainingDays: 2,
        }),
      ).toBe("彩園 あと 2 日");
    });
    it("未知のプレースホルダーはそのまま残す", () => {
      expect(formatUnverifiedKickMessage("{unknown}", {})).toBe("{unknown}");
    });
  });

  describe("buildDmMessage", () => {
    it("デフォルト文（未設定時）に変数を差し込む", () => {
      const body = buildDmMessage({
        t,
        serverName: "S",
        graceDays: 7,
        warnDays: 5,
        remainingDays: 2,
      });
      // テスト t はキーをそのまま返すため、テンプレート＝キー文字列に変数差し込みは起きない
      expect(body).toBe("unverifiedKick:default.dm_message");
    });
    it("カスタム文があれば変数を差し込む", () => {
      const body = buildDmMessage({
        t,
        serverName: "彩園",
        graceDays: 7,
        warnDays: 5,
        remainingDays: 2,
        customMessage: "{serverName} 残り{remainingDays}日",
      });
      expect(body).toBe("彩園 残り2日");
    });
  });

  describe("buildWarnNotification", () => {
    it("カスタム文を本文に出し count などを差し込む", () => {
      const { content, embeds } = buildWarnNotification(
        [candidate({ userId: "u1" })],
        {
          ...baseCtx,
          customMessage: "{count}名 猶予{graceDays}日",
        },
      );
      expect(content).toBe("1名 猶予7日");
      expect(embeds).toHaveLength(1);
    });

    it("mentionEnabled:true なら全対象のメンションを本文に含める", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
        mentionEnabled: true,
        customMessage: "警告",
      });
      expect(content).toBe("警告\n<@u1>");
    });

    it("mentionEnabled:false ならメンションを本文に含めない", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
        mentionEnabled: false,
        customMessage: "警告",
      });
      expect(content).toBe("警告");
    });

    it("カスタム未設定ならデフォルト文（キー文字列）を本文にする", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
      });
      expect(content).toBe("unverifiedKick:default.notify_message");
    });

    it("Embed にキック予定日タイムスタンプと対象メンバーフィールドを含む", () => {
      const { embeds } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
        customMessage: "msg",
      });
      const fields = embeds[0]?.data.fields ?? [];
      const scheduleField = fields.find((f) => f.value.startsWith("<t:"));
      expect(scheduleField?.value).toMatch(/^<t:\d+:f>$/);
      const memberField = fields.find((f) => f.value.includes("<@u1>"));
      expect(memberField).toBeDefined();
    });
  });

  describe("buildKickNotification", () => {
    it("表示名と userId を 'displayName (`userId`)' 形式で Embed に列挙する", () => {
      const { embeds } = buildKickNotification(
        [
          { userId: "111", displayName: "Alice" },
          { userId: "222", displayName: "Bob" },
        ],
        {
          t,
          verifiedRoleId: "role-x",
          testMode: false,
        },
      );
      expect(embeds).toHaveLength(1);
      const json = embeds[0]?.toJSON();
      // 認証ロールはフィールド名ではなく description にメンションを出す（先頭 embed のみ）
      expect(json?.description).toBe("unverifiedKick:embed.description.kick");
      expect(json?.fields?.[0]?.value).toBe("Alice (`111`), Bob (`222`)");
    });

    it("テストモードでは注記フィールドを追加する", () => {
      const normal = buildKickNotification(
        [{ userId: "1", displayName: "A" }],
        { t, testMode: false },
      );
      const test = buildKickNotification([{ userId: "1", displayName: "A" }], {
        t,
        testMode: true,
      });
      expect(normal.embeds[0]?.data.fields).toHaveLength(1);
      expect(test.embeds[0]?.data.fields).toHaveLength(2);
    });
  });

  describe("buildPreviewEmbedPages", () => {
    const empty: CandidateBuckets = {
      warn: [],
      kick: [],
      clearWarn: [],
    };
    it("対象 0 件なら none ページ", () => {
      const pages = buildPreviewEmbedPages(empty, t);
      expect(pages).toHaveLength(1);
      expect(pages[0]?.toJSON().description).toBe(
        "unverifiedKick:preview.none",
      );
    });
    it("対象ありなら区分行を含む", () => {
      const buckets: CandidateBuckets = {
        warn: [candidate({ userId: "w1" })],
        kick: [candidate({ userId: "k1", ageDays: 10 })],
        clearWarn: [],
      };
      const pages = buildPreviewEmbedPages(buckets, t);
      const desc = pages[0]?.toJSON().description ?? "";
      expect(desc).toContain("unverifiedKick:preview.section.kick");
      expect(desc).toContain("unverifiedKick:preview.section.warn");
    });
  });
});
