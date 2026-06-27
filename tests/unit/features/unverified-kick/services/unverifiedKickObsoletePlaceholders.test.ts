// tests/unit/features/unverified-kick/services/unverifiedKickObsoletePlaceholders.test.ts

import {
  buildObsoleteUnverifiedKickNotice,
  detectObsoleteUnverifiedKickPlaceholders,
} from "@/features/unverified-kick/services/unverifiedKickObsoletePlaceholders";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

// detectObsoleteUnverifiedKickPlaceholders と buildObsoleteUnverifiedKickNotice の検出・Embed 構築ロジックを検証
describe("unverified-kick/unverifiedKickObsoletePlaceholders", () => {
  describe("detectObsoleteUnverifiedKickPlaceholders", () => {
    it("全フィールドが undefined のとき何も検出しない", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({});
      expect(result.hasMarkerRole).toBe(false);
    });

    it("全フィールドが null のとき何も検出しない", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({
        notifyTemplate: null,
        dmTemplate: null,
      });
      expect(result.hasMarkerRole).toBe(false);
    });

    it("廃止プレースホルダーを含まないテンプレートでは何も検出しない", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({
        notifyTemplate: "{serverName} で {count} 名が警告対象",
        dmTemplate: "{graceDays} 日以内に認証してください",
      });
      expect(result.hasMarkerRole).toBe(false);
    });

    it("notifyTemplate に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({
        notifyTemplate: "{markerRole} 対象の方へ",
      });
      expect(result.hasMarkerRole).toBe(true);
    });

    it("dmTemplate に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({
        dmTemplate: "対象: {markerRole}",
      });
      expect(result.hasMarkerRole).toBe(true);
    });

    it("notifyTemplate が null でも dmTemplate に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteUnverifiedKickPlaceholders({
        notifyTemplate: null,
        dmTemplate: "{markerRole}",
      });
      expect(result.hasMarkerRole).toBe(true);
    });
  });

  describe("buildObsoleteUnverifiedKickNotice", () => {
    it("hasMarkerRole=false のとき null を返す", () => {
      const result = buildObsoleteUnverifiedKickNotice(t, {
        hasMarkerRole: false,
      });
      expect(result).toBeNull();
    });

    it("hasMarkerRole=true のとき markerRole フィールドを含む Embed を返す", () => {
      const embed = buildObsoleteUnverifiedKickNotice(t, {
        hasMarkerRole: true,
      });
      expect(embed).not.toBeNull();
      const data = embed!.data;
      expect(data.title).toBe("unverifiedKick:embed.title.obsolete_notice");
      expect(data.description).toBe(
        "unverifiedKick:embed.description.obsolete_notice",
      );
      const fieldNames = (data.fields ?? []).map((f) => f.name);
      expect(fieldNames).toContain(
        "unverifiedKick:embed.field.name.obsolete_marker_role",
      );
    });
  });
});
