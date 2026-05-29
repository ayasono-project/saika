// src/bot/features/sticky-message/services/stickyMessagePayloadBuilder.ts
// スティッキーメッセージ送信ペイロードビルダー

import { EmbedBuilder, type MessageCreateOptions } from "discord.js";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { StickyEmbedData, StickyMessage } from "../repositories/types";

// StickyEmbedData は shared のドメイン型に集約済み。既存の import 互換のため再エクスポートする。
export type { StickyEmbedData };

/**
 * StickyMessage エンティティから Discord 送信ペイロードを生成する
 * @param sticky スティッキーメッセージエンティティ
 * @returns Discord 送信ペイロード
 */
export function buildStickyMessagePayload(
  sticky: StickyMessage,
): MessageCreateOptions {
  if (sticky.embedData) {
    const embed = buildEmbedFromData(sticky.embedData, sticky.content);
    return { embeds: [embed] };
  }

  return { content: sticky.content };
}

/**
 * Embed データ（jsonb）から EmbedBuilder を生成する
 * @param data Embed 設定
 * @param fallbackContent description 未設定時のフォールバックテキスト
 * @returns EmbedBuilder インスタンス
 */
function buildEmbedFromData(
  data: StickyEmbedData,
  fallbackContent: string,
): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(
    data.color ?? EMBED_COLORS.STICKY_MESSAGE_DEFAULT,
  );

  if (data.title) embed.setTitle(data.title);
  embed.setDescription(data.description ?? fallbackContent);

  return embed;
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
