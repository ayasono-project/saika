// src/bot/features/member-log/handlers/memberLogUtils.ts
// メンバーログハンドラー共通のフォーマットユーティリティ

import type { GuildTFunction } from "../../../../shared/locale/helpers";

/**
 * カスタムメッセージのプレースホルダーを置換する
 * @param template プレースホルダー付きテンプレート文字列
 * @param user ユーザーメンション文字列
 * @param username ユーザー名
 * @param memberCount メンバー数
 * @param serverName サーバー名
 * @returns 置換済み文字列
 */
export function formatCustomMessage(
  template: string,
  user: string,
  username: string,
  memberCount: number,
  serverName: string,
): string {
  // {userMention}, {userName}, {memberCount}, {serverName} プレースホルダーを実値へ置換
  return template
    .replace(/\{userMention\}/g, user)
    .replace(/\{userName\}/g, username)
    .replace(/\{memberCount\}/g, String(memberCount))
    .replace(/\{serverName\}/g, serverName);
}

/**
 * アカウント年齢を「X年Y月Z日」形式の文字列にフォーマットする
 * @param years 年数
 * @param months 月数
 * @param days 日数
 * @param t ギルドロケール対応の翻訳関数
 * @returns フォーマット済み年齢文字列
 */
export function formatAccountAge(
  years: number,
  months: number,
  days: number,
  t: GuildTFunction,
): string {
  const parts: string[] = [];
  if (years > 0)
    parts.push(t("memberLog:embed.field.value.age_years", { count: years }));
  if (months > 0)
    parts.push(t("memberLog:embed.field.value.age_months", { count: months }));
  if (days > 0 || parts.length === 0)
    parts.push(t("memberLog:embed.field.value.age_days", { count: days }));
  return parts.join(t("memberLog:embed.field.value.age_separator"));
}
