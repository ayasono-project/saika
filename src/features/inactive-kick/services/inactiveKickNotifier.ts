// src/features/inactive-kick/services/inactiveKickNotifier.ts
// 段階通知・キック通知の Embed 整形（member-log の流儀: 本文可変・embed 固定・単一波括弧変数）

import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import type { CategorizedCandidate } from "./inactiveKickCandidates";

/** 1 ページあたりの対象メンバー件数（1 フィールド 1024 文字制約に十分収まる件数） */
export const NOTIFICATION_PAGE_SIZE = 25;

/**
 * 単一波括弧 `{name}` プレースホルダーを実値へ置換する。
 * 未知のプレースホルダーはそのまま残す。
 * @param template テンプレート文字列
 * @param vars プレースホルダー名 → 値のマップ
 * @returns 置換済み文字列
 */
export function formatInactiveKickMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** 配列を指定サイズごとに分割する */
function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/** 段階通知 Embed 構築のコンテキスト */
export interface WarnEmbedContext {
  t: GuildTFunction;
  serverName: string;
  thresholdDays: number;
  /** カスタム事前通知メッセージ（未設定時はデフォルト文を使う） */
  customMessage?: string;
  /** 対象ロール ID（メンション用・未設定時 undefined） */
  markerRoleId?: string;
}

/**
 * 段階通知（1 週間前 / 最終警告）の Embed ページ配列を構築する。
 * 件数が 1 ページに収まる場合は単一要素配列を返す。
 * @param candidates 対象メンバー（同一段階）
 * @param ctx 構築コンテキスト
 * @returns Embed ページ配列（1 件以上）
 */
export function buildWarnEmbedPages(
  candidates: CategorizedCandidate[],
  ctx: WarnEmbedContext,
): EmbedBuilder[] {
  const total = candidates.length;
  // 最も差し迫った（残日数最小）を代表値として用いる
  const minDaysLeft = candidates.reduce(
    (min, c) => Math.min(min, c.daysLeft),
    Number.POSITIVE_INFINITY,
  );
  const markerMention = ctx.markerRoleId ? `<@&${ctx.markerRoleId}>` : "";

  const template =
    ctx.customMessage ?? ctx.t("inactiveKick:default.warn_message");
  const description = formatInactiveKickMessage(template, {
    count: total,
    daysLeft: minDaysLeft,
    thresholdDays: ctx.thresholdDays,
    serverName: ctx.serverName,
    markerRole: markerMention,
  });

  const scheduleValue =
    minDaysLeft <= 0
      ? ctx.t("inactiveKick:embed.field.value.soon")
      : ctx.t("inactiveKick:embed.field.value.days_left", {
          count: minDaysLeft,
        });

  const pages = chunk(candidates, NOTIFICATION_PAGE_SIZE);
  return pages.map((page) =>
    new EmbedBuilder()
      .setColor(EMBED_COLORS.INACTIVE_KICK_WARN)
      .setTitle(ctx.t("inactiveKick:embed.title.warn"))
      .setDescription(description)
      .addFields(
        {
          name: ctx.t("inactiveKick:embed.field.name.target_members"),
          value: page.map((c) => `<@${c.userId}>`).join("\n"),
        },
        {
          name: ctx.t("inactiveKick:embed.field.name.kick_schedule"),
          value: scheduleValue,
        },
      )
      .setTimestamp(),
  );
}

/** キック通知 Embed 構築のコンテキスト */
export interface KickEmbedContext {
  t: GuildTFunction;
  serverName: string;
  thresholdDays: number;
  /** カスタムキック通知メッセージ（未設定時はデフォルト文を使う） */
  customMessage?: string;
  /** テストモード（実際にはキックしていない）か */
  testMode: boolean;
}

/**
 * キック通知（当日）の Embed ページ配列を構築する。
 * メンバーは退出後にメンションが解決されないため、キック前に控えた表示名を用いる。
 * @param kickedNames キックしたメンバーの表示名一覧（キック前に控えたもの）
 * @param ctx 構築コンテキスト
 * @returns Embed ページ配列（1 件以上）
 */
export function buildKickEmbedPages(
  kickedNames: string[],
  ctx: KickEmbedContext,
): EmbedBuilder[] {
  const total = kickedNames.length;
  const template =
    ctx.customMessage ?? ctx.t("inactiveKick:default.kick_message");
  const description = formatInactiveKickMessage(template, {
    count: total,
    thresholdDays: ctx.thresholdDays,
    serverName: ctx.serverName,
  });

  const pages = chunk(kickedNames, NOTIFICATION_PAGE_SIZE);
  return pages.map((page) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INACTIVE_KICK_KICK)
      .setTitle(ctx.t("inactiveKick:embed.title.kick"))
      .setDescription(description)
      .addFields({
        name: ctx.t("inactiveKick:embed.field.name.kicked_members"),
        value: page.join("\n"),
      })
      .setTimestamp();

    if (ctx.testMode) {
      embed.addFields({
        name: ctx.t("inactiveKick:embed.field.name.test_mode"),
        value: ctx.t("inactiveKick:embed.field.value.test_mode"),
      });
    }
    return embed;
  });
}
