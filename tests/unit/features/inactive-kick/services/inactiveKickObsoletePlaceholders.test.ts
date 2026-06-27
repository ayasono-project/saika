// tests/unit/features/inactive-kick/services/inactiveKickObsoletePlaceholders.test.ts

import {
  buildObsoleteInactiveKickNotice,
  detectObsoleteInactiveKickPlaceholders,
} from "@/features/inactive-kick/services/inactiveKickObsoletePlaceholders";
import type { GuildTFunction } from "@/shared/locale/helpers";

// テスト用翻訳関数: キー文字列をそのまま返す
const t = ((key: string) => key) as unknown as GuildTFunction;

// detectObsoleteInactiveKickPlaceholders と buildObsoleteInactiveKickNotice の検出・Embed 構築ロジックを検証
describe("inactive-kick/inactiveKickObsoletePlaceholders", () => {
  describe("detectObsoleteInactiveKickPlaceholders", () => {
    it("全フィールドが undefined のとき何も検出しない", () => {
      const result = detectObsoleteInactiveKickPlaceholders({});
      expect(result.hasDaysLeft).toBe(false);
      expect(result.hasMarkerRole).toBe(false);
    });

    it("全フィールドが null のとき何も検出しない", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: null,
        finalWarnMessage: null,
        kickMessage: null,
      });
      expect(result.hasDaysLeft).toBe(false);
      expect(result.hasMarkerRole).toBe(false);
    });

    it("廃止プレースホルダーを含まないテンプレートでは何も検出しない", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: "{serverName} で {count} 名が対象です",
        finalWarnMessage: "{thresholdDays} 日超過",
        kickMessage: "{serverName} からキックされました",
      });
      expect(result.hasDaysLeft).toBe(false);
      expect(result.hasMarkerRole).toBe(false);
    });

    it("weekWarnMessage に {daysLeft} があれば hasDaysLeft=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: "あと {daysLeft} 日で自動退出",
      });
      expect(result.hasDaysLeft).toBe(true);
      expect(result.hasMarkerRole).toBe(false);
    });

    it("finalWarnMessage に {daysLeft} があれば hasDaysLeft=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        finalWarnMessage: "{daysLeft} 日後にキック",
      });
      expect(result.hasDaysLeft).toBe(true);
    });

    it("kickMessage に {daysLeft} があれば hasDaysLeft=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        kickMessage: "{daysLeft}",
      });
      expect(result.hasDaysLeft).toBe(true);
    });

    it("weekWarnMessage に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: "{markerRole} 対象の方へ",
      });
      expect(result.hasMarkerRole).toBe(true);
      expect(result.hasDaysLeft).toBe(false);
    });

    it("finalWarnMessage に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        finalWarnMessage: "{markerRole}",
      });
      expect(result.hasMarkerRole).toBe(true);
    });

    it("kickMessage に {markerRole} があれば hasMarkerRole=true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        kickMessage: "対象: {markerRole}",
      });
      expect(result.hasMarkerRole).toBe(true);
    });

    it("同一フィールドに {daysLeft} と {markerRole} の両方があれば両方 true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: "{markerRole} あと {daysLeft} 日",
      });
      expect(result.hasDaysLeft).toBe(true);
      expect(result.hasMarkerRole).toBe(true);
    });

    it("{daysLeft} と {markerRole} が別フィールドにあっても両方 true を返す", () => {
      const result = detectObsoleteInactiveKickPlaceholders({
        weekWarnMessage: "{daysLeft}",
        kickMessage: "{markerRole}",
      });
      expect(result.hasDaysLeft).toBe(true);
      expect(result.hasMarkerRole).toBe(true);
    });
  });

  describe("buildObsoleteInactiveKickNotice", () => {
    it("hasDaysLeft=false かつ hasMarkerRole=false のとき null を返す", () => {
      const result = buildObsoleteInactiveKickNotice(t, {
        hasDaysLeft: false,
        hasMarkerRole: false,
      });
      expect(result).toBeNull();
    });

    it("hasMarkerRole=true のとき markerRole フィールドを含む Embed を返す", () => {
      const embed = buildObsoleteInactiveKickNotice(t, {
        hasDaysLeft: false,
        hasMarkerRole: true,
      });
      expect(embed).not.toBeNull();
      const data = embed!.data;
      expect(data.title).toBe("inactiveKick:embed.title.obsolete_notice");
      expect(data.description).toBe(
        "inactiveKick:embed.description.obsolete_notice",
      );
      const fieldNames = (data.fields ?? []).map((f) => f.name);
      expect(fieldNames).toContain(
        "inactiveKick:embed.field.name.obsolete_marker_role",
      );
      expect(fieldNames).not.toContain(
        "inactiveKick:embed.field.name.obsolete_days_left",
      );
    });

    it("hasDaysLeft=true のとき daysLeft フィールドを含む Embed を返す", () => {
      const embed = buildObsoleteInactiveKickNotice(t, {
        hasDaysLeft: true,
        hasMarkerRole: false,
      });
      expect(embed).not.toBeNull();
      const fieldNames = (embed!.data.fields ?? []).map((f) => f.name);
      expect(fieldNames).toContain(
        "inactiveKick:embed.field.name.obsolete_days_left",
      );
      expect(fieldNames).not.toContain(
        "inactiveKick:embed.field.name.obsolete_marker_role",
      );
    });

    it("両方 true のとき markerRole フィールドが daysLeft フィールドより先に来る", () => {
      const embed = buildObsoleteInactiveKickNotice(t, {
        hasDaysLeft: true,
        hasMarkerRole: true,
      });
      expect(embed).not.toBeNull();
      const fieldNames = (embed!.data.fields ?? []).map((f) => f.name);
      expect(fieldNames).toHaveLength(2);
      expect(fieldNames[0]).toBe(
        "inactiveKick:embed.field.name.obsolete_marker_role",
      );
      expect(fieldNames[1]).toBe(
        "inactiveKick:embed.field.name.obsolete_days_left",
      );
    });
  });
});
