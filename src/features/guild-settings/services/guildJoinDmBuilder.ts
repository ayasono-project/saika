// 導入時・再導入時にサーバーオーナーへ送る DM の Embed 組み立て

import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";

const JOIN_DM_I18N_KEYS = {
  INTRO_TITLE: "guildSettings:embed.title.join_intro",
  INTRO_DESCRIPTION: "guildSettings:embed.description.join_intro",
  RETENTION_NAME: "guildSettings:embed.field.name.data_retention",
  RETENTION_VALUE: "guildSettings:embed.field.value.data_retention",
  MANUAL_NAME: "guildSettings:embed.field.name.manual",
  DASHBOARD_NAME: "guildSettings:embed.field.name.dashboard",
  PRIVACY_NAME: "guildSettings:embed.field.name.privacy_policy",
  SUPPORT_NAME: "guildSettings:embed.field.name.support_server",
  RETURN_TITLE: "guildSettings:embed.title.join_return",
  RETURN_DESCRIPTION: "guildSettings:embed.description.join_return",
} as const;

/**
 * DM に併記する言語ごとの翻訳関数
 *
 * **DM は日本語と英語を1通に併記する。** Bot は相手のクライアント言語を interaction
 * 無しでは知れず、`guild.preferredLocale` は非 Community サーバーでは常に `en-US`
 *（＝未設定の意味）なので、どちらか一方を選ぶ手段が無い（2026-09-25 決定）。
 */
export type GuildJoinDmTranslators = {
  ja: GuildTFunction;
  en: GuildTFunction;
};

/** 見出し（タイトル・フィールド名）で日英を並べる区切り */
const LABEL_SEPARATOR = " / ";

/** 本文で日英を並べる区切り（段落を分ける） */
const TEXT_SEPARATOR = "\n\n";

/** 導入時 DM に載せるリンク（未設定の URL は省略する） */
export type GuildJoinDmLinks = {
  manualUrl?: string | undefined;
  dashboardUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
  supportServerUrl?: string | undefined;
};

/**
 * Discord のタイムスタンプ記法へ変換する
 *
 * 受け取る側のタイムゾーン・言語で表示されるため、こちらで書式を決めない。
 * @param date 変換する日時
 * @returns `<t:秒:D>` 形式の文字列
 */
function toDiscordDate(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:D>`;
}

/**
 * 同じキーを日本語 → 英語の順に解決して連結する
 * @param t 言語ごとの翻訳関数
 * @param key 翻訳キー
 * @param separator 日英の区切り
 * @param params 補間パラメータ
 * @returns 日英を併記した文字列
 */
function bilingual(
  t: GuildJoinDmTranslators,
  key: (typeof JOIN_DM_I18N_KEYS)[keyof typeof JOIN_DM_I18N_KEYS],
  separator: string,
  params?: Record<string, unknown>,
): string {
  return `${t.ja(key, params)}${separator}${t.en(key, params)}`;
}

/**
 * 新規導入時にオーナーへ送る DM の Embed を組み立てる
 *
 * 役割は「告知した事実を作ること」なので、案内は入口だけに絞る。
 * @param t 言語ごとの翻訳関数（日本語 → 英語の順に併記する）
 * @param graceDays データの保持日数
 * @param links 載せるリンク（未設定の URL はフィールドを出さない）
 * @returns 送信用の Embed
 */
export function buildGuildJoinIntroDm(
  t: GuildJoinDmTranslators,
  graceDays: number,
  links: GuildJoinDmLinks,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.ABOUT)
    .setTitle(bilingual(t, JOIN_DM_I18N_KEYS.INTRO_TITLE, LABEL_SEPARATOR))
    .setDescription(
      bilingual(t, JOIN_DM_I18N_KEYS.INTRO_DESCRIPTION, TEXT_SEPARATOR),
    )
    .addFields({
      name: bilingual(t, JOIN_DM_I18N_KEYS.RETENTION_NAME, LABEL_SEPARATOR),
      value: bilingual(t, JOIN_DM_I18N_KEYS.RETENTION_VALUE, TEXT_SEPARATOR, {
        days: graceDays,
      }),
    });

  // URL は env で出し分ける（未設定の行を出すと死んだリンクになる）。
  // 値は URL だけなので言語を問わず1つで足りる
  const linkFields = [
    [JOIN_DM_I18N_KEYS.MANUAL_NAME, links.manualUrl],
    [JOIN_DM_I18N_KEYS.DASHBOARD_NAME, links.dashboardUrl],
    [JOIN_DM_I18N_KEYS.PRIVACY_NAME, links.privacyPolicyUrl],
    [JOIN_DM_I18N_KEYS.SUPPORT_NAME, links.supportServerUrl],
  ] as const;
  for (const [nameKey, url] of linkFields) {
    if (!url) continue;
    embed.addFields({
      name: bilingual(t, nameKey, LABEL_SEPARATOR),
      value: url,
    });
  }

  return embed;
}

/**
 * 猶予期間内の再導入でオーナーへ送る DM の Embed を組み立てる
 *
 * 「削除予約を取り消した」ことと「いつ消えるはずだったか」を伝えるのが本体。
 * 設定が「すべて」戻ったとは書かない。チケットの自動削除タイマーは再導入時に
 * 組み直す（`syncGuildTickets`）が、Bump リマインダーの予約は退出時に DB でも
 * 取り消しているため戻らない（`stopGuildJobsUsecase`）。
 * @param t 言語ごとの翻訳関数（日本語 → 英語の順に併記する）
 * @param cancelledDeletionAt 取り消した削除予定時刻
 * @returns 送信用の Embed
 */
export function buildGuildJoinReturnDm(
  t: GuildJoinDmTranslators,
  cancelledDeletionAt: Date,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.ABOUT)
    .setTitle(bilingual(t, JOIN_DM_I18N_KEYS.RETURN_TITLE, LABEL_SEPARATOR))
    .setDescription(
      bilingual(t, JOIN_DM_I18N_KEYS.RETURN_DESCRIPTION, TEXT_SEPARATOR, {
        deleteAt: toDiscordDate(cancelledDeletionAt),
      }),
    );
}
