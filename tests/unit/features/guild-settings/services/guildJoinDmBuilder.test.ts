// 導入・再導入 DM の Embed 組み立てのテスト

import {
  addInaccessibleTicketChannelsField,
  buildGuildJoinIntroDm,
  buildGuildJoinReturnDm,
  type GuildJoinDmTranslators,
} from "@/features/guild-settings/services/guildJoinDmBuilder";
import type { GuildTFunction } from "@/shared/locale/helpers";
import { localeManager } from "@/shared/locale/localeManager";

/** Discord の Embed のフィールドの値の上限（超えると送信が失敗する） */
const EMBED_FIELD_VALUE_MAX_LENGTH = 1024;

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

// 日英の併記順・保持期間の告知が常に載ること・URL の出し分け・再導入 DM の日時表記・
// Bot が扱えないチケットのチャンネルの欄を検証する
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

  describe("addInaccessibleTicketChannelsField", () => {
    it("再導入 DM に、件数を埋め込んだ欄を日本語 → 英語の順に併記して1つ足すこと", () => {
      const deleteAt = new Date("2026-10-24T00:00:00.000Z");
      const embed = buildGuildJoinReturnDm(t, deleteAt);

      const result = addInaccessibleTicketChannelsField(embed, t, 3);

      expect(result).toBe(embed);
      expect(embed.toJSON().fields).toEqual([
        {
          name: "ja:guildSettings:embed.field.name.inaccessible_ticket_channels / en:guildSettings:embed.field.name.inaccessible_ticket_channels",
          value:
            'ja:guildSettings:embed.field.value.inaccessible_ticket_channels:{"count":3}\n\nen:guildSettings:embed.field.value.inaccessible_ticket_channels:{"count":3}',
        },
      ]);
    });

    it("導入 DM にも、既存の欄の後ろに足せること", () => {
      const embed = buildGuildJoinIntroDm(t, 30, {
        manualUrl: "https://example.com/manual",
      });

      addInaccessibleTicketChannelsField(embed, t, 1);

      const fields = embed.toJSON().fields ?? [];
      expect(fields).toHaveLength(3);
      expect(fields[2]?.name).toContain(
        "guildSettings:embed.field.name.inaccessible_ticket_channels",
      );
    });

    // 実際の文面で、原因・手順・他の非公開チャンネルへの言及と、フィールドの上限に収まることを確かめる
    describe("実際の文面（ja/en）", () => {
      // 翻訳の結果を検証するため、ロケールを初期化する
      beforeAll(async () => {
        await localeManager.initialize();
      });

      /**
       * 実際の日本語・英語の翻訳関数を作る
       * @returns 言語ごとの翻訳関数
       */
      function createRealTranslators(): GuildJoinDmTranslators {
        return {
          ja: localeManager.getFixedT("ja") as unknown as GuildTFunction,
          en: localeManager.getFixedT("en") as unknown as GuildTFunction,
        };
      }

      it("件数・原因・付け直す手順（4つの権限・カテゴリでは反映されない）・他の非公開チャンネルも付け直しが要ることを、日英とも伝えること", () => {
        const embed = addInaccessibleTicketChannelsField(
          buildGuildJoinReturnDm(createRealTranslators(), new Date()),
          createRealTranslators(),
          7,
        );

        const value = embed.toJSON().fields?.[0]?.value ?? "";
        for (const text of [
          "**7件**",
          "Discord が Bot の権限を消した",
          "「チャンネルの編集」→「権限」",
          "「チャンネルを見る」「メッセージを送信」「埋め込みリンク」「メッセージ履歴を読む」",
          "カテゴリの権限を変えても反映されません",
          "エラー通知チャンネルやログなど、Bot 用に権限を付けていた非公開チャンネル",
          "**7** ticket channel(s)",
          "Discord removed the bot's permissions",
          "Edit Channel → Permissions",
          "View Channel, Send Messages, Embed Links, and Read Message History",
          "changing the category's permissions does not apply",
          "such as the error notification channel or log channels",
        ]) {
          expect(value).toContain(text);
        }
      });

      it("件数が大きくても、欄の値は Embed のフィールドの上限（1024文字）に収まること", () => {
        const embed = addInaccessibleTicketChannelsField(
          buildGuildJoinReturnDm(createRealTranslators(), new Date()),
          createRealTranslators(),
          99_999,
        );

        const value = embed.toJSON().fields?.[0]?.value ?? "";
        expect(value.length).toBeLessThanOrEqual(EMBED_FIELD_VALUE_MAX_LENGTH);
      });
    });
  });
});
