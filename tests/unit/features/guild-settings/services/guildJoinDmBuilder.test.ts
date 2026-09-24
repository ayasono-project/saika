// 導入・再導入 DM の Embed 組み立てのテスト

import {
  buildGuildJoinIntroDm,
  buildGuildJoinReturnDm,
} from "@/features/guild-settings/services/guildJoinDmBuilder";

/**
 * 言語タグ・キー・補間値をそのまま返す翻訳関数を作る
 * @param lang 出力の先頭に付ける言語タグ
 * @returns どの言語のどのキーがどの値で描画されたかを検証できる翻訳関数
 */
function createT(lang: string) {
  return ((key: string, options?: Record<string, unknown>) =>
    options
      ? `${lang}:${key}:${JSON.stringify(options)}`
      : `${lang}:${key}`) as never;
}

const t = { ja: createT("ja"), en: createT("en") };

// 日英の併記順・保持期間の告知が常に載ること・URL の出し分け・再導入 DM の日時表記を検証する
describe("features/guild-settings/guildJoinDmBuilder", () => {
  describe("buildGuildJoinIntroDm", () => {
    it("タイトルと本文を日本語 → 英語の順に併記すること", () => {
      const json = buildGuildJoinIntroDm(t, 30, {}).toJSON();

      expect(json.title).toBe(
        "ja:guildSettings:embed.title.join_intro / en:guildSettings:embed.title.join_intro",
      );
      expect(json.description).toBe(
        "ja:guildSettings:embed.description.join_intro\n\nen:guildSettings:embed.description.join_intro",
      );
    });

    it("URL が1つも無くても保持期間の告知フィールドは必ず載り、日英とも保持日数を埋め込むこと", () => {
      const json = buildGuildJoinIntroDm(t, 30, {}).toJSON();

      expect(json.fields).toHaveLength(1);
      expect(json.fields?.[0]?.value).toBe(
        'ja:guildSettings:embed.field.value.data_retention:{"days":30}\n\nen:guildSettings:embed.field.value.data_retention:{"days":30}',
      );
    });

    it("設定済みの URL だけをフィールドに出し、値は URL そのものにすること（死んだリンクを出さない）", () => {
      const json = buildGuildJoinIntroDm(t, 30, {
        manualUrl: "https://example.com/manual",
        privacyPolicyUrl: "https://example.com/privacy",
      }).toJSON();

      expect(json.fields?.slice(1)).toEqual([
        {
          name: "ja:guildSettings:embed.field.name.manual / en:guildSettings:embed.field.name.manual",
          value: "https://example.com/manual",
        },
        {
          name: "ja:guildSettings:embed.field.name.privacy_policy / en:guildSettings:embed.field.name.privacy_policy",
          value: "https://example.com/privacy",
        },
      ]);
    });

    it("4種類すべての URL を設定すると保持期間＋4件のフィールドになること", () => {
      const embed = buildGuildJoinIntroDm(t, 30, {
        manualUrl: "https://example.com/manual",
        dashboardUrl: "https://example.com/dash",
        privacyPolicyUrl: "https://example.com/privacy",
        supportServerUrl: "https://discord.gg/example",
      });

      expect(embed.toJSON().fields).toHaveLength(5);
    });

    it("保持日数を定数から受け取って埋め込むこと", () => {
      const embed = buildGuildJoinIntroDm(t, 7, {});

      expect(embed.toJSON().fields?.[0]?.value).toContain('"days":7');
    });
  });

  describe("buildGuildJoinReturnDm", () => {
    it("削除予定日時を Discord のタイムスタンプ記法で日英両方に埋め込むこと（受信側のタイムゾーンで表示させる）", () => {
      const deleteAt = new Date("2026-10-24T00:00:00.000Z");

      const embed = buildGuildJoinReturnDm(t, deleteAt);

      expect(embed.toJSON().description).toBe(
        'ja:guildSettings:embed.description.join_return:{"deleteAt":"<t:1792800000:D>"}\n\nen:guildSettings:embed.description.join_return:{"deleteAt":"<t:1792800000:D>"}',
      );
    });

    it("リンクのフィールドは持たないこと（伝えるのは削除を取り消した事実だけ）", () => {
      const embed = buildGuildJoinReturnDm(t, new Date());

      expect(embed.toJSON().fields).toBeUndefined();
    });
  });
});
