// src/bot/shared/vcActionLog.ts
// /vc disconnect・/vc move・/afk の操作結果を表す共通アクションログ Embed を生成するユーティリティ

import { EmbedBuilder } from "discord.js";
import { tInteraction } from "../../shared/locale/localeManager";

/** 共通アクションログが対象とする操作種別 */
export type VcActionType = "disconnect" | "move" | "afk";

/** アクションログ Embed の共通カラー（Discord blurple） */
export const VC_ACTION_LOG_COLOR = 0x5865f2;

/** メンション一覧フィールドに表示する最大メンバー数 */
const MAX_MENTION_DISPLAY = 20;

/** タイトル先頭に付与する操作種別ごとの絵文字 */
const ACTION_EMOJI: Record<VcActionType, string> = {
  // 接続を断ち切る（壊れた鎖）/ 移動（矢印）/ 休憩（ベッド）
  disconnect: "⛓️‍💥",
  move: "➡️",
  afk: "🛏️",
};

/** 操作種別ごとのタイトル i18n キー */
const TITLE_KEYS = {
  disconnect: "vc:action-log.title.disconnect",
  move: "vc:action-log.title.move",
  afk: "vc:action-log.title.afk",
} as const;

/** 操作種別 × 個別/一括ごとの説明テンプレート i18n キー */
const DESC_KEYS = {
  disconnect_individual: "vc:action-log.desc.disconnect_individual",
  disconnect_bulk: "vc:action-log.desc.disconnect_bulk",
  move_individual: "vc:action-log.desc.move_individual",
  move_bulk: "vc:action-log.desc.move_bulk",
  afk_individual: "vc:action-log.desc.afk_individual",
  afk_bulk: "vc:action-log.desc.afk_bulk",
} as const;

/** 操作種別ごとの監査ログ理由（未指定時のデフォルト）i18n キー */
const AUDIT_KEYS = {
  disconnect: "vc:action-log.audit.disconnect",
  move: "vc:action-log.audit.move",
  afk: "vc:action-log.audit.afk",
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
  /** 移動先VCチャンネルID（move / afk のみ） */
  destinationChannelId?: string;
  /** ユーザー指定の理由（未指定時は「指定なし」表示） */
  reason?: string;
}

/**
 * 監査ログに渡す理由文字列を解決する（ユーザー未指定時は操作種別ごとのデフォルト文言）
 * @param action 操作種別
 * @param locale interaction.locale
 * @param userReason ユーザー指定の理由（任意）
 * @returns 監査ログ用の理由文字列
 */
export function resolveAuditReason(
  action: VcActionType,
  locale: string,
  userReason?: string,
): string {
  return userReason ?? tInteraction(locale, AUDIT_KEYS[action]);
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
  const more = tInteraction(locale, "vc:action-log.failures_more", {
    count: userIds.length - MAX_MENTION_DISPLAY,
  });
  return `${shown} ${more}`;
}

/**
 * /vc disconnect・/vc move・/afk の操作結果を表す共通アクションログ Embed を生成する
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
      name: tInteraction(locale, "vc:action-log.field.invoker"),
      value: `<@${invokerId}>`,
      inline: true,
    },
    {
      name: tInteraction(locale, "vc:action-log.field.target"),
      value: targetValue,
      inline: true,
    },
  ];

  // 移動系（move / afk）は移動先フィールドを追加する
  if (params.destinationChannelId) {
    fields.push({
      name: tInteraction(locale, "vc:action-log.field.destination"),
      value: `<#${params.destinationChannelId}>`,
      inline: true,
    });
  }

  fields.push({
    name: tInteraction(locale, "vc:action-log.field.reason"),
    value: params.reason ?? tInteraction(locale, "vc:action-log.reason_none"),
    inline: false,
  });

  // 一括かつ失敗があった場合のみ失敗内訳フィールドを表示する
  if (isBulk && params.failureUserIds && params.failureUserIds.length > 0) {
    fields.push({
      name: tInteraction(locale, "vc:action-log.field.failures"),
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
