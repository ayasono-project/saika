// src/features/unverified-kick/services/unverifiedKickNotifier.ts
// 警告 DM・キック予告（通知チャンネル）・キックサマリー（ログチャンネル）の整形（単一波括弧変数）

import { EmbedBuilder } from "discord.js";
import { STATUS_COLORS } from "../../../bot/utils/messageResponse";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import type {
  CandidateBuckets,
  CategorizedCandidate,
} from "./unverifiedKickCandidates";

/** 1 ページあたりの対象メンバー件数（1 フィールド 1024 文字制約に十分収まる件数） */
export const NOTIFICATION_PAGE_SIZE = 25;

/** preview 1 ページあたりの行数 */
const PREVIEW_LINES_PER_PAGE = 20;

/**
 * 単一波括弧 `{name}` プレースホルダーを実値へ置換する。
 * 未知のプレースホルダーはそのまま残す。
 * @param template テンプレート文字列
 * @param vars プレースホルダー名 → 値のマップ
 * @returns 置換済み文字列
 */
export function formatUnverifiedKickMessage(
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

/** 警告 DM の本文構築コンテキスト */
export interface DmMessageContext {
  t: GuildTFunction;
  serverName: string;
  graceDays: number;
  warnDays: number;
  /** キックまでの残日数（graceDays - warnDays） */
  remainingDays: number;
  /** カスタム DM 本文（未設定時はデフォルト文） */
  customMessage?: string;
}

/**
 * 警告 DM の本文を構築する（カスタム文・未設定時はデフォルト文を単一波括弧で差し込む）。
 * @param ctx 構築コンテキスト
 * @returns DM 本文（プレーンテキスト）
 */
export function buildDmMessage(ctx: DmMessageContext): string {
  const template =
    ctx.customMessage ?? ctx.t("unverifiedKick:default.dm_message");
  return formatUnverifiedKickMessage(template, {
    serverName: ctx.serverName,
    graceDays: ctx.graceDays,
    warnDays: ctx.warnDays,
    remainingDays: ctx.remainingDays,
  });
}

/** 通知の構築結果（本文 + 固定 Embed ページ） */
export interface NotificationContent {
  /** メッセージ本文（対象ロールメンション等）。未指定なら本文なし */
  content?: string;
  /** 固定構成の Embed ページ */
  embeds: EmbedBuilder[];
}

/** キック予告（通知チャンネル）構築のコンテキスト */
export interface WarnNotificationContext {
  t: GuildTFunction;
  /** 現在時刻（キック予定日の算出に使用） */
  now: Date;
  serverName: string;
  graceDays: number;
  warnDays: number;
  /** カスタムキック予告本文（未設定時はデフォルト文） */
  customMessage?: string;
  /** 対象ロール ID（`{markerRole}` を本文に含めたときだけメンション） */
  markerRoleId?: string;
}

/**
 * キック予告（通知チャンネル）の本文 + 固定 Embed を構築する。
 * 本文はカスタム文（未設定時はデフォルト文）で、`{markerRole}` を含めたときだけ対象ロールを
 * メンションする（member-log 流儀: 本文可変・Embed 固定）。Embed は対象一覧・キック予定の固定構成。
 * @param candidates 事前警告対象メンバー
 * @param ctx 構築コンテキスト
 * @returns 本文（空なら undefined） + Embed ページ
 */
export function buildWarnNotification(
  candidates: CategorizedCandidate[],
  ctx: WarnNotificationContext,
): NotificationContent {
  // 最も差し迫った（残日数最小）を代表値として用いる
  const minRemaining = candidates.reduce(
    (min, c) => Math.min(min, c.remainingDays),
    Number.POSITIVE_INFINITY,
  );
  // `{markerRole}` は本文に含まれた場合のみ実メンションになる（未設定なら空文字）
  const markerMention = ctx.markerRoleId ? `<@&${ctx.markerRoleId}>` : "";
  const template =
    ctx.customMessage ?? ctx.t("unverifiedKick:default.notify_message");
  const rendered = formatUnverifiedKickMessage(template, {
    count: candidates.length,
    serverName: ctx.serverName,
    graceDays: ctx.graceDays,
    warnDays: ctx.warnDays,
    remainingDays: minRemaining,
    markerRole: markerMention,
  }).trim();
  const content = rendered.length > 0 ? rendered : undefined;

  // キック予定日（推定）= 現在から最短残日数後。Discord タイムスタンプで各自のロケール日付として表示する
  const predictedKickUnix = Math.floor(
    (ctx.now.getTime() + minRemaining * 24 * 60 * 60 * 1000) / 1000,
  );

  const embeds = chunk(candidates, NOTIFICATION_PAGE_SIZE).map((page) =>
    new EmbedBuilder()
      .setColor(EMBED_COLORS.UNVERIFIED_KICK_WARN)
      .setTitle(ctx.t("unverifiedKick:embed.title.warn"))
      .addFields(
        {
          name: ctx.t("unverifiedKick:embed.field.name.target_members"),
          value: page.map((c) => `<@${c.userId}>`).join("\n"),
        },
        {
          name: ctx.t("unverifiedKick:embed.field.name.kick_schedule"),
          value: `<t:${predictedKickUnix}:D>`,
        },
      )
      .setTimestamp(),
  );

  return { ...(content ? { content } : {}), embeds };
}

/** キックサマリー（ログチャンネル）構築のコンテキスト */
export interface KickNotificationContext {
  t: GuildTFunction;
  /** 認証ロール ID（説明文でメンション表示する。未設定時 undefined） */
  verifiedRoleId?: string;
  /** テストモード（実際にはキックしていない）か */
  testMode: boolean;
}

/**
 * キックサマリー（ログチャンネル）の固定 Embed を構築する。
 * メンバーはユーザーメンション `<@id>`（退出後もグローバルに解決される）で表示する。
 * 認証ロールは説明文でメンション表示する（フィールド名ではメンションがリンク化されないため）。
 * @param kickedUserIds キックしたメンバーのユーザー ID 一覧
 * @param ctx 構築コンテキスト
 * @returns Embed ページ
 */
export function buildKickNotification(
  kickedUserIds: string[],
  ctx: KickNotificationContext,
): NotificationContent {
  // 認証ロールはメンションが解決される description に出す（埋め込み内メンションは ping を飛ばさない）
  const description = ctx.verifiedRoleId
    ? ctx.t("unverifiedKick:embed.description.kick", {
        role: `<@&${ctx.verifiedRoleId}>`,
      })
    : undefined;

  const embeds = chunk(kickedUserIds, NOTIFICATION_PAGE_SIZE).map((page) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.UNVERIFIED_KICK_KICK)
      .setTitle(ctx.t("unverifiedKick:embed.title.kick"))
      .addFields({
        name: ctx.t("unverifiedKick:embed.field.name.kicked_members"),
        value: page.map((id) => `<@${id}>`).join("\n"),
      })
      .setTimestamp();
    if (description) embed.setDescription(description);

    if (ctx.testMode) {
      embed.addFields({
        name: ctx.t("unverifiedKick:embed.field.name.test_mode"),
        value: ctx.t("unverifiedKick:embed.field.value.test_mode"),
      });
    }
    return embed;
  });

  return { embeds };
}

/**
 * 自動無効化（バリデーション失敗）の通知 Embed を構築する。
 * @param t 翻訳関数
 * @param reason エラー詳細（ローカライズ済み文字列）
 * @returns Embed
 */
export function buildDisableNotification(
  t: GuildTFunction,
  reason: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.UNVERIFIED_KICK_KICK)
    .setTitle(t("unverifiedKick:embed.title.disabled"))
    .setDescription(reason)
    .setTimestamp();
}

/**
 * preview（現在のキック対象・事前警告対象の一覧）の Embed ページ配列を構築する。
 * 区分別にメンバーと経過日数を表示する。対象 0 件なら「対象なし」を返す。
 * @param buckets 区分結果
 * @param t 翻訳関数（interaction.locale ベース）
 * @returns Embed ページ配列（1 件以上）
 */
export function buildPreviewEmbedPages(
  buckets: CandidateBuckets,
  t: GuildTFunction,
): EmbedBuilder[] {
  const total = buckets.kick.length + buckets.warn.length;

  const title = t("unverifiedKick:preview.title");
  if (total === 0) {
    return [
      new EmbedBuilder()
        .setColor(STATUS_COLORS.info)
        .setTitle(title)
        .setDescription(t("unverifiedKick:preview.none")),
    ];
  }

  const sections: Array<{
    labelKey: Parameters<GuildTFunction>[0];
    items: CategorizedCandidate[];
  }> = [
    { labelKey: "unverifiedKick:preview.section.kick", items: buckets.kick },
    { labelKey: "unverifiedKick:preview.section.warn", items: buckets.warn },
  ];
  const lines: string[] = [];
  for (const section of sections) {
    if (section.items.length === 0) continue;
    lines.push(`**${t(section.labelKey)}** (${section.items.length})`);
    for (const c of section.items) {
      lines.push(
        t("unverifiedKick:preview.entry", {
          user: `<@${c.userId}>`,
          days: c.ageDays,
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
