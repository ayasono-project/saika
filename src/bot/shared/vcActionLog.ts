// /afk の操作結果を表すアクションログ Embed を生成するユーティリティ

import { EmbedBuilder } from "discord.js";
import { tInteraction } from "../../shared/locale/localeManager";

/**
 * アクションログが対象とする操作種別。
 * 2026-09-20 の `/vc` 削除で disconnect / move が到達不能になり afk だけが残った。
 * ヘルパーを `/afk` 側へ畳む整理は掃除フェーズで行う（→ TODO「タイマー / スケジューラ実装の整理」の並び）。
 */
export type VcActionType = "afk";

/** アクションログ Embed の共通カラー（Discord blurple） */
export const VC_ACTION_LOG_COLOR = 0x5865f2;

/** メンション一覧フィールドに表示する最大メンバー数 */
const MAX_MENTION_DISPLAY = 20;

/** タイトル先頭に付与する操作種別ごとの絵文字 */
const ACTION_EMOJI: Record<VcActionType, string> = {
  // 休憩（ベッド）
  afk: "🛏️",
};

/** 操作種別ごとのタイトル i18n キー */
const TITLE_KEYS = {
  afk: "afk:action-log.title.afk",
} as const;

/** 操作種別 × 個別/一括ごとの説明テンプレート i18n キー */
const DESC_KEYS = {
  afk_individual: "afk:action-log.desc.afk_individual",
  afk_bulk: "afk:action-log.desc.afk_bulk",
} as const;

/** 操作種別ごとの監査ログ理由 i18n キー */
const AUDIT_KEYS = {
  afk: "afk:action-log.audit.afk",
} as const;

/** formatActionLog の入力 */
export interface VcActionLogParams {
  /** 操作種別 */
  action: VcActionType;
  /** interaction.locale */
  locale: string;
  /** 実行者のユーザーID */
  invokerId: string;
  /** 個別操作時の対象ユーザーID（個別操作なら指定） */
  targetUserId?: string;
  /** 一括操作時の対象VCチャンネルID（一括操作なら指定） */
  sourceChannelId?: string;
  /** 一括操作時の対象ユーザーID一覧（対象フィールドにメンションで表示） */
  targetUserIds?: string[];
  /** 一括操作時の失敗ユーザーID一覧 */
  failureUserIds?: string[];
  /** 移動先VCチャンネルID（AFKチャンネル） */
  destinationChannelId?: string;
}

/**
 * Discord の監査ログに渡す理由文字列を解決する
 * @param action 操作種別
 * @param locale interaction.locale
 * @returns 監査ログ用の理由文字列
 */
export function resolveAuditReason(
  action: VcActionType,
  locale: string,
): string {
  return tInteraction(locale, AUDIT_KEYS[action]);
}

/**
 * ユーザーID一覧をフィールド値（メンション列）に整形する。上限超過分は「ほか N 件」で省略
 * @param locale interaction.locale
 * @param userIds 表示対象のユーザーID一覧
 * @returns メンション列のフィールド値
 */
export function formatMentionList(locale: string, userIds: string[]): string {
  const shown = userIds
    .slice(0, MAX_MENTION_DISPLAY)
    .map((id) => `<@${id}>`)
    .join(" ");
  if (userIds.length <= MAX_MENTION_DISPLAY) {
    return shown;
  }
  const more = tInteraction(locale, "afk:action-log.failures_more", {
    count: userIds.length - MAX_MENTION_DISPLAY,
  });
  return `${shown} ${more}`;
}

/**
 * /afk の操作結果を表すアクションログ Embed を生成する
 * @param params アクションログの内容
 * @returns 生成した Embed
 */
export function formatActionLog(params: VcActionLogParams): EmbedBuilder {
  const { action, locale, invokerId } = params;
  const isBulk = params.sourceChannelId != null;
  const scope = isBulk ? "bulk" : "individual";

  const titleText = tInteraction(locale, TITLE_KEYS[action]);
  const description = tInteraction(locale, DESC_KEYS[`${action}_${scope}`], {
    targetId: params.targetUserId,
    channelId: params.sourceChannelId,
    destinationId: params.destinationChannelId,
  });

  // 一括時の対象はメンバーのメンション一覧、個別時は対象ユーザーのメンション
  const targetValue = isBulk
    ? formatMentionList(locale, params.targetUserIds ?? [])
    : `<@${params.targetUserId}>`;

  const fields: { name: string; value: string; inline?: boolean }[] = [
    {
      name: tInteraction(locale, "afk:action-log.field.invoker"),
      value: `<@${invokerId}>`,
      inline: true,
    },
    {
      name: tInteraction(locale, "afk:action-log.field.target"),
      value: targetValue,
      inline: true,
    },
  ];

  // 移動先が解決できている場合のみ移動先フィールドを追加する
  if (params.destinationChannelId) {
    fields.push({
      name: tInteraction(locale, "afk:action-log.field.destination"),
      value: `<#${params.destinationChannelId}>`,
      inline: true,
    });
  }

  // 一括かつ失敗があった場合のみ失敗内訳フィールドを表示する
  if (isBulk && params.failureUserIds && params.failureUserIds.length > 0) {
    fields.push({
      name: tInteraction(locale, "afk:action-log.field.failures"),
      value: formatMentionList(locale, params.failureUserIds),
      inline: false,
    });
  }

  return new EmbedBuilder()
    .setColor(VC_ACTION_LOG_COLOR)
    .setTitle(`${ACTION_EMOJI[action]} ${titleText}`)
    .setDescription(description)
    .addFields(fields);
}
