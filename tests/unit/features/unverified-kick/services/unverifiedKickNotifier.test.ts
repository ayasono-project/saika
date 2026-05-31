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
    const baseCtx = {
      t,
      now: NOW,
      serverName: "彩園",
      graceDays: 7,
      warnDays: 5,
    };

    it("カスタム文の {markerRole} を本文でメンションに展開する", () => {
      const { content, embeds } = buildWarnNotification(
        [candidate({ userId: "u1" })],
        {
          ...baseCtx,
          customMessage: "{markerRole} 対象 {count} 名",
          markerRoleId: "role-x",
        },
      );
      expect(content).toBe("<@&role-x> 対象 1 名");
      expect(embeds).toHaveLength(1);
    });

    it("対象ロール未設定なら {markerRole} は空に展開される", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
        customMessage: "{markerRole}対象 {count} 名",
      });
      // 先頭の空 markerRole は trim される
      expect(content).toBe("対象 1 名");
    });

    it("カスタム未設定ならデフォルト文（キー文字列）を本文にする", () => {
      const { content } = buildWarnNotification([candidate({ userId: "u1" })], {
        ...baseCtx,
      });
      expect(content).toBe("unverifiedKick:default.notify_message");
    });
  });

  describe("buildKickNotification", () => {
    it("メンバーは @ メンション・認証ロールは description でメンション・テストモード表記を付ける", () => {
      const { embeds } = buildKickNotification(["111", "222"], {
        t,
        verifiedRoleId: "role-x",
        testMode: true,
      });
      expect(embeds).toHaveLength(1);
      const json = embeds[0]?.toJSON();
      // 認証ロールはフィールド名ではなく description にメンションを出す
      expect(json?.description).toBe("unverifiedKick:embed.description.kick");
      // メンバー一覧 + テストモードの 2 フィールド
      expect(json?.fields).toHaveLength(2);
      expect(json?.fields?.[0]?.value).toBe("<@111>\n<@222>");
    });
  });

  describe("buildPreviewEmbedPages", () => {
    const empty: CandidateBuckets = { warn: [], kick: [], markerCleanup: [] };
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
        markerCleanup: [],
      };
      const pages = buildPreviewEmbedPages(buckets, t);
      const desc = pages[0]?.toJSON().description ?? "";
      expect(desc).toContain("unverifiedKick:preview.section.kick");
      expect(desc).toContain("unverifiedKick:preview.section.warn");
    });
  });
});
