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

// /afk の結果 Embed（個別 / 一括・移動先・失敗内訳）と監査ログ理由の生成を検証する
describe("bot/shared/vcActionLog", () => {
  describe("formatActionLog", () => {
    it("個別移動: タイトル・説明・実行者/対象/移動先フィールドを生成する", () => {
      const embed = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
        destinationChannelId: "afk-1",
      });

      expect(embed.data.color).toBe(VC_ACTION_LOG_COLOR);
      expect(embed.data.title).toBe("🛏️ afk:action-log.title.afk");
      expect(embed.data.description).toContain(
        "afk:action-log.desc.afk_individual",
      );
      expect(fieldValue(embed, "afk:action-log.field.invoker")).toBe(
        "<@inv-1>",
      );
      expect(fieldValue(embed, "afk:action-log.field.target")).toBe("<@tgt-1>");
      expect(fieldValue(embed, "afk:action-log.field.destination")).toBe(
        "<#afk-1>",
      );
      // 個別移動では失敗内訳フィールドを出さない
      expect(
        fieldValue(embed, "afk:action-log.field.failures"),
      ).toBeUndefined();
    });

    it("一括移動: 対象はメンバーのメンション一覧になり、失敗内訳フィールドを含む", () => {
      const embed = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: ["t-1", "t-2", "t-3"],
        failureUserIds: ["f-1", "f-2"],
        destinationChannelId: "afk-1",
      });

      expect(embed.data.description).toContain("afk:action-log.desc.afk_bulk");
      expect(fieldValue(embed, "afk:action-log.field.target")).toBe(
        "<@t-1> <@t-2> <@t-3>",
      );
      expect(fieldValue(embed, "afk:action-log.field.failures")).toBe(
        "<@f-1> <@f-2>",
      );
    });

    it("一括移動で失敗が無い場合は失敗内訳フィールドを表示しない", () => {
      const embed = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: ["t-1", "t-2"],
        failureUserIds: [],
        destinationChannelId: "afk-1",
      });

      expect(
        fieldValue(embed, "afk:action-log.field.failures"),
      ).toBeUndefined();
    });

    it("移動先が解決できていない場合は移動先フィールドを表示しない", () => {
      const embed = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
      });

      expect(
        fieldValue(embed, "afk:action-log.field.destination"),
      ).toBeUndefined();
    });

    it("失敗が表示上限を超える場合は failures_more で省略表記する", () => {
      const failureUserIds = Array.from({ length: 25 }, (_, i) => `f-${i}`);
      const embed = formatActionLog({
        action: "afk",
        locale: "ja",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
        targetUserIds: failureUserIds,
        failureUserIds,
        destinationChannelId: "afk-1",
      });

      const value = fieldValue(embed, "afk:action-log.field.failures") ?? "";
      // 先頭20件のメンション + 省略表記
      expect(value).toContain("<@f-0>");
      expect(value).toContain("<@f-19>");
      expect(value).not.toContain("<@f-20>");
      expect(value).toContain("afk:action-log.failures_more");
    });
  });

  describe("resolveAuditReason", () => {
    it("監査ログ用の既定文言キーを返す", () => {
      expect(resolveAuditReason("afk", "ja")).toBe("afk:action-log.audit.afk");
    });
  });
});
