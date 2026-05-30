// tests/unit/bot/shared/vcActionLog.test.ts

import {
  formatActionLog,
  resolveAuditReason,
  VC_ACTION_LOG_COLOR,
} from "@/bot/shared/vcActionLog";

// i18n はキー（＋パラメータ）をそのまま返してテンプレート選択・差し込みを検証する
vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}|${JSON.stringify(params)}` : key),
}));

/** EmbedBuilder からフィールド値を name で引く */
function fieldValue(
  embed: { data: { fields?: { name: string; value: string }[] } },
  nameKey: string,
): string | undefined {
  return embed.data.fields?.find((f) => f.name === nameKey)?.value;
}

describe("bot/shared/vcActionLog", () => {
  describe("formatActionLog", () => {
    it("disconnect 個別: タイトル・説明・対象/理由フィールドを生成する", () => {
      const embed = formatActionLog({
        action: "disconnect",
        locale: "ja",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
      });

      expect(embed.data.color).toBe(VC_ACTION_LOG_COLOR);
      expect(embed.data.title).toBe("⛓️‍💥 vc:action-log.title.disconnect");
      expect(embed.data.description).toContain(
        "vc:action-log.desc.disconnect_individual",
      );
      expect(fieldValue(embed, "vc:action-log.field.invoker")).toBe("<@inv-1>");
      expect(fieldValue(embed, "vc:action-log.field.target")).toBe("<@tgt-1>");
      // 理由未指定なら reason_none
      expect(fieldValue(embed, "vc:action-log.field.reason")).toBe(
        "vc:action-log.reason_none",
      );
    });

    it("disconnect 一括: 対象はメンバーのメンション一覧、失敗内訳フィールドを含む", () => {
      const embed = formatActionLog({
        action: "disconnect",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: ["t-1", "t-2", "t-3"],
        failureUserIds: ["f-1", "f-2"],
      });

      expect(embed.data.description).toContain(
        "vc:action-log.desc.disconnect_bulk",
      );
      // 対象フィールドは対象メンバーのメンション一覧
      expect(fieldValue(embed, "vc:action-log.field.target")).toBe(
        "<@t-1> <@t-2> <@t-3>",
      );
      expect(fieldValue(embed, "vc:action-log.field.failures")).toBe(
        "<@f-1> <@f-2>",
      );
    });

    it("一括で失敗が無い場合は失敗内訳フィールドを表示しない", () => {
      const embed = formatActionLog({
        action: "disconnect",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: ["t-1", "t-2"],
        failureUserIds: [],
      });

      expect(fieldValue(embed, "vc:action-log.field.failures")).toBeUndefined();
    });

    it("move 個別: 移動先フィールドと move_individual テンプレートを使う", () => {
      const embed = formatActionLog({
        action: "move",
        locale: "ja",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
        destinationChannelId: "dest-1",
        reason: "整理のため",
      });

      expect(embed.data.title).toBe("➡️ vc:action-log.title.move");
      expect(embed.data.description).toContain(
        "vc:action-log.desc.move_individual",
      );
      expect(fieldValue(embed, "vc:action-log.field.destination")).toBe(
        "<#dest-1>",
      );
      // ユーザー指定の理由はそのまま表示
      expect(fieldValue(embed, "vc:action-log.field.reason")).toBe(
        "整理のため",
      );
    });

    it("afk 個別/一括: afk テンプレートと AFK 移動タイトルを使う", () => {
      const individual = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
        destinationChannelId: "afk-1",
      });
      expect(individual.data.title).toBe("🛏️ vc:action-log.title.afk");
      expect(individual.data.description).toContain(
        "vc:action-log.desc.afk_individual",
      );

      const bulk = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: ["t-1", "t-2"],
        destinationChannelId: "afk-1",
      });
      expect(bulk.data.description).toContain("vc:action-log.desc.afk_bulk");
      expect(fieldValue(bulk, "vc:action-log.field.target")).toBe(
        "<@t-1> <@t-2>",
      );
    });

    it("失敗が表示上限を超える場合は failures_more で省略表記する", () => {
      const failureUserIds = Array.from({ length: 25 }, (_, i) => `f-${i}`);
      const embed = formatActionLog({
        action: "disconnect",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: failureUserIds,
        failureUserIds,
      });

      const value = fieldValue(embed, "vc:action-log.field.failures") ?? "";
      // 先頭20件のメンション + 省略表記
      expect(value).toContain("<@f-0>");
      expect(value).toContain("<@f-19>");
      expect(value).not.toContain("<@f-20>");
      expect(value).toContain("vc:action-log.failures_more");
    });
  });

  describe("resolveAuditReason", () => {
    it("ユーザー指定の理由があればそのまま返す", () => {
      expect(resolveAuditReason("disconnect", "ja", "荒らし対応")).toBe(
        "荒らし対応",
      );
    });

    it("未指定なら操作種別ごとのデフォルト文言キーを返す", () => {
      expect(resolveAuditReason("disconnect", "ja")).toBe(
        "vc:action-log.audit.disconnect",
      );
      expect(resolveAuditReason("move", "ja")).toBe("vc:action-log.audit.move");
      expect(resolveAuditReason("afk", "ja")).toBe("vc:action-log.audit.afk");
    });
  });
});
