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

/** Embed フィールド 1 件あたりの最大文字数 */
const MAX_FIELD_VALUE_LENGTH = 1024;
/** Embed 1 件あたりの最大フィールド数 */
const MAX_FIELDS_PER_EMBED = 25;
/** Embed 1 件あたりの最大合計文字数（おおよそ） */
const MAX_EMBED_CHARS = 6000;

/** preview 1 ページあたりの行数 */
const PREVIEW_LINES_PER_PAGE = 20;

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
        // 単一メンションが 1024 文字を超えることはないが、念のため切り詰め
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
 * `now + daysLeft 日後` の日付を `timezone` で取得し、その日の `runHour`:00 を UTC Unix 秒で返す。
 */
function computeKickUnix(
  now: Date,
  daysLeft: number,
  runHour: number,
  timezone: string,
): number {
  const futureDateMs = now.getTime() + daysLeft * 86400 * 1000;
  const futureDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(new Date(futureDateMs));

  const [y, m, d] = futureDateStr.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const candidateUtcMs = Date.UTC(y, m - 1, d, runHour, 0, 0);

  // TZ オフセット推定: candidateUtcMs をそのタイムゾーンで表示したときの時刻を UTC として解釈し差を取る
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
  /** ギルドのタイムゾーン（IANA。キック予定日時の算出に使用） */
  timezone: string;
  /** ギルドの実行時刻（キック予定日時の算出に使用） */
  runHour: number;
  /** 個別メンション通知を有効にするか */
  mentionEnabled: boolean;
  /** カスタム事前通知メッセージ（未設定時は defaultMessageKey のデフォルト文を使う） */
  customMessage?: string;
  /** カスタム未設定時に使うデフォルト文の翻訳キー（段階別） */
  defaultMessageKey: Parameters<GuildTFunction>[0];
}

/**
 * 段階通知（1 週間前 / 最終警告）の本文 + 固定 Embed を構築する。
 *
 * - キック予定日時グループ（daysLeft 別）ごとに Embed を作成し昇順に並べる
 * - 最初の Embed にのみタイトルを設定する
 * - 対象メンバーフィールドはスペース区切りメンションを 1024 文字で動的分割する
 * - `mentionEnabled` が true なら全対象ユーザーの個別メンションを本文に出す
 * @param candidates 対象メンバー（同一段階）
 * @param ctx 構築コンテキスト
 * @returns 本文 + Embed ページ
 */
export function buildWarnNotification(
  candidates: CategorizedCandidate[],
  ctx: WarnNotificationContext,
): NotificationContent {
  const total = candidates.length;

  const template = ctx.customMessage ?? ctx.t(ctx.defaultMessageKey);
  const content = formatInactiveKickMessage(template, {
    count: total,
    thresholdDays: ctx.thresholdDays,
    serverName: ctx.serverName,
  });

  // mentionEnabled が true なら全対象の個別メンションを本文末尾に付ける（本文から分離）
  const mentionText =
    ctx.mentionEnabled && candidates.length > 0
      ? candidates.map((c) => `<@${c.userId}>`).join(" ")
      : undefined;

  // daysLeft 昇順でグループ化
  const sorted = [...candidates].sort((a, b) => a.daysLeft - b.daysLeft);
  const groupMap = new Map<number, CategorizedCandidate[]>();
  for (const c of sorted) {
    const arr = groupMap.get(c.daysLeft) ?? [];
    arr.push(c);
    groupMap.set(c.daysLeft, arr);
  }

  const embeds: EmbedBuilder[] = [];
  let isFirst = true;

  for (const [daysLeft, group] of groupMap) {
    const kickUnix = computeKickUnix(
      ctx.now,
      daysLeft,
      ctx.runHour,
      ctx.timezone,
    );
    const scheduleValue = `<t:${kickUnix}:f>`;
    const memberFieldName = ctx.t(
      "inactiveKick:embed.field.name.target_members",
    );
    const scheduleFieldName = ctx.t(
      "inactiveKick:embed.field.name.kick_schedule",
    );
    const memberFields = splitMentionFields(
      memberFieldName,
      group.map((c) => c.userId),
    );

    // フィールド数・文字数で Embed を分割する
    let currentEmbed: EmbedBuilder | null = null;
    let currentFieldCount = 0;
    let currentCharCount = 0;

    const flushEmbed = () => {
      if (currentEmbed) {
        embeds.push(currentEmbed);
        currentEmbed = null;
        currentFieldCount = 0;
        currentCharCount = 0;
        isFirst = false;
      }
    };

    const openEmbed = (): EmbedBuilder => {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.INACTIVE_KICK_WARN)
        .setTimestamp();
      if (isFirst) {
        embed.setTitle(ctx.t("inactiveKick:embed.title.warn"));
      }
      embed.addFields({ name: scheduleFieldName, value: scheduleValue });
      currentFieldCount = 1;
      currentCharCount =
        scheduleFieldName.length +
        scheduleValue.length +
        (isFirst ? ctx.t("inactiveKick:embed.title.warn").length : 0);
      currentEmbed = embed;
      return embed;
    };

    for (const field of memberFields) {
      const embed = currentEmbed ?? openEmbed();
      const fieldChars = field.name.length + field.value.length;
      if (
        currentFieldCount >= MAX_FIELDS_PER_EMBED ||
        currentCharCount + fieldChars > MAX_EMBED_CHARS
      ) {
        flushEmbed();
        openEmbed().addFields(field);
      } else {
        embed.addFields(field);
      }
      currentFieldCount++;
      currentCharCount += fieldChars;
    }
    flushEmbed();
  }

  // mentionEnabled の個別メンションテキストは sendNotification の content として渡す
  // カスタム/デフォルト本文と分けて別メッセージで送る形にする
  const allContent =
    [content, mentionText].filter(Boolean).join("\n") || undefined;

  return { content: allContent, embeds };
}

/**
 * キックしたメンバーの一覧を `displayName (userId)` 形式でフィールド配列へ動的分割する。
 * 各フィールド値が 1024 文字を超えないようにコンマ区切りで詰める。
 */
function splitKickedMemberFields(
  fieldName: string,
  kicked: { displayName: string; userId: string }[],
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
 * メンバーは退出後にメンションが解決されないため、キック前に控えた表示名をカンマ区切りで表示する。
 * @param kickedNames キックしたメンバーの表示名一覧（キック前に控えたもの）
 * @param ctx 構築コンテキスト
 * @returns 本文（未設定時 undefined） + Embed ページ
 */
export function buildKickNotification(
  kicked: { displayName: string; userId: string }[],
  ctx: KickNotificationContext,
): NotificationContent {
  const total = kicked.length;
  const content = ctx.customMessage
    ? formatInactiveKickMessage(ctx.customMessage, {
        count: total,
        thresholdDays: ctx.thresholdDays,
        serverName: ctx.serverName,
      })
    : undefined;

  const fieldName = ctx.t("inactiveKick:embed.field.name.kicked_members");
  const memberFields = splitKickedMemberFields(fieldName, kicked);

  const testModeFieldName = ctx.testMode
    ? ctx.t("inactiveKick:embed.field.name.test_mode")
    : null;
  const testModeFieldValue = ctx.testMode
    ? ctx.t("inactiveKick:embed.field.value.test_mode")
    : null;
  const testModeChars =
    testModeFieldName && testModeFieldValue
      ? testModeFieldName.length + testModeFieldValue.length
      : 0;
  const maxFieldsPerEmbed = ctx.testMode
    ? MAX_FIELDS_PER_EMBED - 1
    : MAX_FIELDS_PER_EMBED;

  const embeds: EmbedBuilder[] = [];
  let isFirst = true;
  let currentEmbed: EmbedBuilder | null = null;
  let currentFieldCount = 0;
  let currentCharCount = 0;

  const flushEmbed = () => {
    if (currentEmbed === null) return;
    if (testModeFieldName && testModeFieldValue) {
      currentEmbed.addFields({
        name: testModeFieldName,
        value: testModeFieldValue,
      });
    }
    embeds.push(currentEmbed);
    currentEmbed = null;
    currentFieldCount = 0;
    currentCharCount = 0;
    isFirst = false;
  };

  const openEmbed = (): EmbedBuilder => {
    const titleText = ctx.t("inactiveKick:embed.title.kick");
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INACTIVE_KICK_KICK)
      .setTimestamp();
    if (isFirst) embed.setTitle(titleText);
    currentFieldCount = 0;
    currentCharCount = (isFirst ? titleText.length : 0) + testModeChars;
    currentEmbed = embed;
    return embed;
  };

  for (const field of memberFields) {
    const fieldChars = field.name.length + field.value.length;
    if (
      currentEmbed === null ||
      currentFieldCount >= maxFieldsPerEmbed ||
      currentCharCount + fieldChars > MAX_EMBED_CHARS
    ) {
      flushEmbed();
      currentEmbed = openEmbed();
    }
    currentEmbed.addFields(field);
    currentFieldCount++;
    currentCharCount += fieldChars;
  }
  flushEmbed();

  return { content, embeds };
}

/**
 * preview（現在のキック対象・通知対象の一覧）の Embed ページ配列を構築する。
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
