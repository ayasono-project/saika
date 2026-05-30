// src/features/inactive-kick/services/inactiveKickNotifier.ts
// 段階通知・キック通知の Embed 整形（member-log の流儀: 本文可変・embed 固定・単一波括弧変数）

import { EmbedBuilder } from "discord.js";
import { STATUS_COLORS } from "../../../bot/utils/messageResponse";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import type {
  CandidateBuckets,
  CategorizedCandidate,
} from "./inactiveKickCandidates";

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

/** 通知の構築結果（本文 + 固定 Embed ページ） */
export interface NotificationContent {
  /** メッセージ本文（カスタム文。member-log 流儀で本文可変・embed 固定）。未指定なら本文なし */
  content?: string;
  /** 固定構成の Embed ページ（対象一覧などの構造化情報） */
  embeds: EmbedBuilder[];
}

/** 段階通知 構築のコンテキスト */
export interface WarnNotificationContext {
  t: GuildTFunction;
  serverName: string;
  thresholdDays: number;
  /** 現在時刻（キック予定日の算出に使用） */
  now: Date;
  /** カスタム事前通知メッセージ（未設定時は defaultMessageKey のデフォルト文を使う） */
  customMessage?: string;
  /** カスタム未設定時に使うデフォルト文の翻訳キー（段階別） */
  defaultMessageKey: Parameters<GuildTFunction>[0];
  /** 対象ロール ID（`{markerRole}` 置換用・未設定時 undefined） */
  markerRoleId?: string;
}

/**
 * 段階通知（1 週間前 / 最終警告）の本文 + 固定 Embed を構築する。
 *
 * カスタム文は**メッセージ本文**に出す（embed 固定の方針）。`{markerRole}` を本文に
 * 含めた場合のみロールメンションが入る（自動メンションはしない）。Embed は対象メンバー一覧と
 * キック予定のみの固定構成で、件数超過時は複数ページに分割する。
 * @param candidates 対象メンバー（同一段階）
 * @param ctx 構築コンテキスト
 * @returns 本文 + Embed ページ
 */
export function buildWarnNotification(
  candidates: CategorizedCandidate[],
  ctx: WarnNotificationContext,
): NotificationContent {
  const total = candidates.length;
  // 最も差し迫った（残日数最小）を代表値として用いる
  const minDaysLeft = candidates.reduce(
    (min, c) => Math.min(min, c.daysLeft),
    Number.POSITIVE_INFINITY,
  );
  // `{markerRole}` は本文に含まれた場合のみ実メンションになる（未設定なら空文字）
  const markerMention = ctx.markerRoleId ? `<@&${ctx.markerRoleId}>` : "";

  const template = ctx.customMessage ?? ctx.t(ctx.defaultMessageKey);
  const content = formatInactiveKickMessage(template, {
    count: total,
    daysLeft: minDaysLeft,
    thresholdDays: ctx.thresholdDays,
    serverName: ctx.serverName,
    markerRole: markerMention,
  });

  // キック予定日（推定）= 現在から最短残日数後。Discord タイムスタンプで各自のロケール日付として表示する
  // （実行は日次チェック時のため時刻までは保証せず、日付粒度で示す）
  const predictedKickUnix = Math.floor(
    (ctx.now.getTime() + minDaysLeft * 24 * 60 * 60 * 1000) / 1000,
  );
  const scheduleValue = `<t:${predictedKickUnix}:D>`;

  const embeds = chunk(candidates, NOTIFICATION_PAGE_SIZE).map((page) =>
    new EmbedBuilder()
      .setColor(EMBED_COLORS.INACTIVE_KICK_WARN)
      .setTitle(ctx.t("inactiveKick:embed.title.warn"))
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

  return { content, embeds };
}

/** キック通知 構築のコンテキスト */
export interface KickNotificationContext {
  t: GuildTFunction;
  serverName: string;
  thresholdDays: number;
  /** カスタムキック通知メッセージ。未設定時は本文を出さない（Embed のみ） */
  customMessage?: string;
  /** テストモード（実際にはキックしていない）か */
  testMode: boolean;
}

/**
 * キック通知（当日）の本文 + 固定 Embed を構築する。
 * 事前通知と異なりデフォルト文は持たず、**カスタム文が設定されたときだけ**本文を出す
 * （未設定なら本文なし＝Embed のみ）。Embed はキックしたメンバー一覧（固定）。
 * メンバーは退出後にメンションが解決されないため、キック前に控えた表示名を用いる。
 * @param kickedNames キックしたメンバーの表示名一覧（キック前に控えたもの）
 * @param ctx 構築コンテキスト
 * @returns 本文（未設定時 undefined） + Embed ページ
 */
export function buildKickNotification(
  kickedNames: string[],
  ctx: KickNotificationContext,
): NotificationContent {
  const total = kickedNames.length;
  // カスタム文が無ければ本文なし（Embed のみ）
  const content = ctx.customMessage
    ? formatInactiveKickMessage(ctx.customMessage, {
        count: total,
        thresholdDays: ctx.thresholdDays,
        serverName: ctx.serverName,
      })
    : undefined;

  const embeds = chunk(kickedNames, NOTIFICATION_PAGE_SIZE).map((page) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INACTIVE_KICK_KICK)
      .setTitle(ctx.t("inactiveKick:embed.title.kick"))
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

  return { content, embeds };
}

/** preview 1 ページあたりの行数 */
const PREVIEW_LINES_PER_PAGE = 20;

/**
 * preview（現在のキック対象・通知対象の一覧）の Embed ページ配列を構築する。
 * 段階別にメンバーと非アクティブ日数を表示する。対象 0 件なら「対象なし」を返す。
 * @param buckets 区分結果
 * @param t 翻訳関数（interaction.locale ベース）
 * @returns Embed ページ配列（1 件以上）
 */
export function buildPreviewEmbedPages(
  buckets: CandidateBuckets,
  t: GuildTFunction,
): EmbedBuilder[] {
  const total =
    buckets.kick.length + buckets.finalWarn.length + buckets.weekWarn.length;

  const title = t("inactiveKick:preview.title");
  if (total === 0) {
    return [
      new EmbedBuilder()
        .setColor(STATUS_COLORS.info)
        .setTitle(title)
        .setDescription(t("inactiveKick:preview.none")),
    ];
  }

  // 段階見出し + 各メンバー行を 1 本のリストに連結する
  const sections: Array<{
    labelKey: Parameters<GuildTFunction>[0];
    items: CategorizedCandidate[];
  }> = [
    { labelKey: "inactiveKick:preview.section.kick", items: buckets.kick },
    {
      labelKey: "inactiveKick:preview.section.final",
      items: buckets.finalWarn,
    },
    { labelKey: "inactiveKick:preview.section.week", items: buckets.weekWarn },
  ];
  const lines: string[] = [];
  for (const section of sections) {
    if (section.items.length === 0) continue;
    lines.push(`**${t(section.labelKey)}** (${section.items.length})`);
    for (const c of section.items) {
      lines.push(
        t("inactiveKick:preview.entry", {
          user: `<@${c.userId}>`,
          days: c.inactiveDays,
        }),
      );
    }
  }

  return chunk(lines, PREVIEW_LINES_PER_PAGE).map((pageLines) =>
    new EmbedBuilder()
      .setColor(STATUS_COLORS.info)
      .setTitle(title)
      .setDescription(pageLines.join("\n"))
      .setTimestamp(),
  );
}
