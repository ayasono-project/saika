// src/bot/features/sticky-message/services/stickyMessagePayloadBuilder.ts
// スティッキーメッセージ送信ペイロードビルダー

import { EmbedBuilder, type MessageCreateOptions } from "discord.js";
import { EMBED_COLORS } from "../../../../shared/constants/embedColors";
import type { StickyMessage } from "../repositories/types";

/** Embed データの型 */
export interface StickyEmbedData {
  title?: string;
  description?: string;
  color?: number;
}

/**
 * StickyMessage エンティティから Discord 送信ペイロードを生成する
 * @param sticky スティッキーメッセージエンティティ
 * @returns Discord 送信ペイロード
 */
export function buildStickyMessagePayload(
  sticky: StickyMessage,
): MessageCreateOptions {
  if (sticky.embedData) {
    const embed = parseEmbedData(sticky.embedData, sticky.content);
    return { embeds: [embed] };
  }

  return { content: sticky.content };
}

/**
 * JSON 文字列から EmbedBuilder を生成する
 * @param embedDataJson Embed 設定の JSON 文字列
 * @param fallbackContent JSON パース失敗時のフォールバックテキスト
 * @returns EmbedBuilder インスタンス
 */
function parseEmbedData(
  embedDataJson: string,
  fallbackContent: string,
): EmbedBuilder {
  try {
    const data = JSON.parse(embedDataJson) as StickyEmbedData;
    const embed = new EmbedBuilder().setColor(
      data.color ?? EMBED_COLORS.STICKY_MESSAGE_DEFAULT,
    );

    if (data.title) embed.setTitle(data.title);
    embed.setDescription(data.description ?? fallbackContent);

    return embed;
  } catch {
    // JSON パース失敗時はプレーンテキストで代用
    return new EmbedBuilder()
      .setColor(EMBED_COLORS.STICKY_MESSAGE_DEFAULT)
      .setDescription(fallbackContent);
  }
}

/**
 * カラーコード文字列を数値に変換する（失敗時はスティッキーメッセージデフォルトカラー）
 * @param colorStr カラーコード文字列（`#RRGGBB` / `0xRRGGBB` / `RRGGBB` 形式、または null/undefined）
 * @returns 数値カラーコード
 */
export function parseColorStr(colorStr: string | null | undefined): number {
  if (!colorStr) return EMBED_COLORS.STICKY_MESSAGE_DEFAULT;
  const normalized = colorStr.startsWith("#")
    ? colorStr.slice(1)
    : colorStr.startsWith("0x") || colorStr.startsWith("0X")
      ? colorStr.slice(2)
      : colorStr;
  const parsed = parseInt(normalized, 16);
  return isNaN(parsed) ? EMBED_COLORS.STICKY_MESSAGE_DEFAULT : parsed;
}
