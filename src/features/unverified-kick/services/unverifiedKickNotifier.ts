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

/** Embed フィールド 1 件あたりの最大文字数 */
const MAX_FIELD_VALUE_LENGTH = 1024;
/** preview 1 ページあたりの行数 */
const PREVIEW_LINES_PER_PAGE = 20;

/** 配列を指定サイズごとに分割する */
function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/**
 * 単一波括弧 `{name}` プレースホルダーを実値へ置換する。
 * 未知のプレースホルダーはそのまま残す。
 */
export function formatUnverifiedKickMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * ユーザー ID 一覧をスペース区切りメンションにしてフィールド配列へ分割する。
 * 各フィールドが 1024 文字を超えないように動的に区切る。
 */
function splitMentionFields(
  fieldName: string,
  userIds: string[],
): { name: string; value: string }[] {
  const fields: { name: string; value: string }[] = [];
  let current = "";

  for (const userId of userIds) {
    const mention = `<@${userId}>`;
    const candidate = current.length > 0 ? `${current} ${mention}` : mention;

    if (candidate.length > MAX_FIELD_VALUE_LENGTH) {
      if (current.length > 0) {
        fields.push({ name: fieldName, value: current });
        current = mention;
      } else {
        fields.push({
          name: fieldName,
          value: mention.slice(0, MAX_FIELD_VALUE_LENGTH),
        });
        current = "";
      }
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) fields.push({ name: fieldName, value: current });
  return fields;
}

/**
 * キック予定 Unix タイムスタンプを算出する。
 * `now + remainingDays 日後` の日付を `timezone` で取得し、その日の `runHour`:00 を UTC Unix 秒で返す。
 */
function computeKickUnix(
  now: Date,
  remainingDays: number,
  runHour: number,
  timezone: string,
): number {
  const futureDateMs = now.getTime() + remainingDays * 86400 * 1000;
  const futureDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(new Date(futureDateMs));

  const [y, m, d] = futureDateStr.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const candidateUtcMs = Date.UTC(y, m - 1, d, runHour, 0, 0);

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date(candidateUtcMs));

  const get = (type: string) =>
    parseInt(tzParts.find((p) => p.type === type)?.value ?? "0", 10);
  const tzAsUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  const offsetMs = candidateUtcMs - tzAsUtcMs;

  return Math.floor((Date.UTC(y, m - 1, d, runHour, 0, 0) + offsetMs) / 1000);
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
 * 警告 DM の本文を構築する。
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
  content?: string;
  embeds: EmbedBuilder[];
}

/** キック予告（通知チャンネル）構築のコンテキスト */
export interface WarnNotificationContext {
  t: GuildTFunction;
  now: Date;
  serverName: string;
  graceDays: number;
  warnDays: number;
  /** ギルドのタイムゾーン（IANA） */
  timezone: string;
  /** ギルドの実行時刻（キック予定日時の算出に使用） */
  runHour: number;
  /** 個別メンション通知を有効にするか */
  mentionEnabled: boolean;
  /** カスタムキック予告本文（未設定時はデフォルト文） */
  customMessage?: string;
}

/**
 * キック予告（通知チャンネル）の本文 + 固定 Embed を構築する。
 * - `mentionEnabled` が true なら全対象の個別メンションを本文に出す
 * - Embed の対象メンバーフィールドは動的 1024 文字分割
 * - キック予定日時は `<t:unix:f>` 形式
 */
export function buildWarnNotification(
  candidates: CategorizedCandidate[],
  ctx: WarnNotificationContext,
): NotificationContent {
  const minRemaining = candidates.reduce(
    (min, c) => Math.min(min, c.remainingDays),
    Number.POSITIVE_INFINITY,
  );
  const template =
    ctx.customMessage ?? ctx.t("unverifiedKick:default.notify_message");
  const rendered = formatUnverifiedKickMessage(template, {
    count: candidates.length,
    serverName: ctx.serverName,
    graceDays: ctx.graceDays,
    warnDays: ctx.warnDays,
    remainingDays: minRemaining,
  }).trim();

  const mentionText =
    ctx.mentionEnabled && candidates.length > 0
      ? candidates.map((c) => `<@${c.userId}>`).join(" ")
      : undefined;

  const allContent =
    [rendered || undefined, mentionText].filter(Boolean).join("\n") ||
    undefined;

  const kickUnix = computeKickUnix(
    ctx.now,
    minRemaining,
    ctx.runHour,
    ctx.timezone,
  );
  const scheduleValue = `<t:${kickUnix}:f>`;
  const memberFieldName = ctx.t(
    "unverifiedKick:embed.field.name.target_members",
  );
  const scheduleFieldName = ctx.t(
    "unverifiedKick:embed.field.name.kick_schedule",
  );
  const memberFields = splitMentionFields(
    memberFieldName,
    candidates.map((c) => c.userId),
  );

  const firstEmbed = new EmbedBuilder()
    .setColor(EMBED_COLORS.UNVERIFIED_KICK_WARN)
    .setTitle(ctx.t("unverifiedKick:embed.title.warn"))
    .addFields({ name: scheduleFieldName, value: scheduleValue })
    .setTimestamp();

  const embeds: EmbedBuilder[] = [firstEmbed];
  for (const field of memberFields) {
    const last = embeds[embeds.length - 1];
    const lastFields = last.data.fields ?? [];
    if (lastFields.length >= 25) {
      embeds.push(
        new EmbedBuilder()
          .setColor(EMBED_COLORS.UNVERIFIED_KICK_WARN)
          .addFields(field)
          .setTimestamp(),
      );
    } else {
      last.addFields(field);
    }
  }

  return { content: allContent, embeds };
}

/** キックサマリー（ログチャンネル）構築のコンテキスト */
export interface KickNotificationContext {
  t: GuildTFunction;
  verifiedRoleId?: string;
  testMode: boolean;
}

/** kicked メンバーの情報（キック前に控えた表示名） */
export interface KickedMember {
  userId: string;
  displayName: string;
}

/**
 * kicked メンバーを `displayName (\`userId\`)` 形式で 1024 文字以内のフィールドに動的分割する。
 */
function splitKickedMemberFields(
  fieldName: string,
  kicked: KickedMember[],
): { name: string; value: string }[] {
  const fields: { name: string; value: string }[] = [];
  let current = "";
  for (const { displayName, userId } of kicked) {
    const entry = `${displayName} (\`${userId}\`)`;
    const candidate = current.length > 0 ? `${current}, ${entry}` : entry;
    if (candidate.length > MAX_FIELD_VALUE_LENGTH) {
      if (current.length > 0) {
        fields.push({ name: fieldName, value: current });
        current = entry;
      } else {
        fields.push({
          name: fieldName,
          value: entry.slice(0, MAX_FIELD_VALUE_LENGTH),
        });
        current = "";
      }
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) fields.push({ name: fieldName, value: current });
  return fields;
}

/**
 * キックサマリー（ログチャンネル）の固定 Embed を構築する。
 * - タイトルと verifiedRole description は先頭 Embed のみ
 * - メンバーは `displayName (\`userId\`)` 形式で動的 1024 文字分割
 */
export function buildKickNotification(
  kicked: KickedMember[],
  ctx: KickNotificationContext,
): NotificationContent {
  const memberFieldName = ctx.t(
    "unverifiedKick:embed.field.name.kicked_members",
  );
  const description = ctx.verifiedRoleId
    ? ctx.t("unverifiedKick:embed.description.kick", {
        role: `<@&${ctx.verifiedRoleId}>`,
      })
    : undefined;

  const memberFields = splitKickedMemberFields(memberFieldName, kicked);
  const embeds: EmbedBuilder[] = [];
  let isFirst = true;

  for (const field of memberFields) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.UNVERIFIED_KICK_KICK)
      .addFields(field)
      .setTimestamp();
    if (isFirst) {
      embed.setTitle(ctx.t("unverifiedKick:embed.title.kick"));
      if (description) embed.setDescription(description);
      isFirst = false;
    }
    if (ctx.testMode) {
      embed.addFields({
        name: ctx.t("unverifiedKick:embed.field.name.test_mode"),
        value: ctx.t("unverifiedKick:embed.field.value.test_mode"),
      });
    }
    embeds.push(embed);
  }

  return { embeds };
}

/**
 * 自動無効化（バリデーション失敗）の通知 Embed を構築する。
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
