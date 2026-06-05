// src/api/features/stickyResource.ts
// メッセージ固定（sticky）の契約マッピングと Discord 投稿反映

import type { StickyMessage as ContractStickyMessage } from "@ayasono/shared/api";
import type { BotClient } from "../../bot/client";
import { getBotStickyMessageSettingsService } from "../../bot/services/botCompositionRoot";
import {
  buildStickyMessagePayload,
  parseColorStr,
} from "../../features/sticky-message/services/stickyMessagePayloadBuilder";
import { EMBED_COLORS } from "../../shared/constants/embedColors";
import type {
  StickyEmbedData,
  StickyMessage,
} from "../../shared/database/types";

/** 数値カラー → `#RRGGBB`（未設定は sticky デフォルト色） */
function numberToHex(color: number | undefined): string {
  const n = color ?? EMBED_COLORS.STICKY_MESSAGE_DEFAULT;
  return `#${n.toString(16).padStart(6, "0").toUpperCase()}`;
}

/** ドメイン → 契約（sticky の embed は title/description/color のみ・fields 非対応） */
export function toContractSticky(domain: StickyMessage): ContractStickyMessage {
  return {
    channelId: domain.channelId,
    content: domain.content,
    embed: domain.embedData
      ? {
          title: domain.embedData.title ?? "",
          description: domain.embedData.description ?? "",
          color: numberToHex(domain.embedData.color),
          fields: [],
        }
      : null,
  };
}

/** 契約の embed → ドメインの StickyEmbedData（fields は破棄・空文字は未設定扱い） */
export function toStickyEmbedData(
  embed: ContractStickyMessage["embed"],
): StickyEmbedData | undefined {
  if (!embed) return undefined;
  return {
    title: embed.title || undefined,
    description: embed.description || undefined,
    color: embed.color ? parseColorStr(embed.color) : undefined,
  };
}

/**
 * sticky をチャンネルへ反映する（旧メッセージを消して再投稿し lastMessageId を更新）。
 * チャンネルが解決できない/送信不可なら DB のみ更新済みとして何もしない。
 */
export async function applyStickyToChannel(
  client: BotClient,
  sticky: StickyMessage,
): Promise<void> {
  const guild = client.guilds.cache.get(sticky.guildId);
  const channel = guild?.channels.cache.get(sticky.channelId);
  if (!channel?.isSendable()) return;

  if (sticky.lastMessageId) {
    // 旧 sticky を削除（既に消えていても無視）
    await channel.messages
      .fetch(sticky.lastMessageId)
      .then((msg) => msg.delete())
      .catch(() => null);
  }
  const sent = await channel.send(buildStickyMessagePayload(sticky));
  await getBotStickyMessageSettingsService().updateLastMessageId(
    sticky.id,
    sent.id,
  );
}

/** sticky の旧メッセージを削除する（削除エンドポイント用・best-effort） */
export async function removeStickyMessage(
  client: BotClient,
  sticky: StickyMessage,
): Promise<void> {
  if (!sticky.lastMessageId) return;
  const guild = client.guilds.cache.get(sticky.guildId);
  const channel = guild?.channels.cache.get(sticky.channelId);
  if (!channel?.isSendable()) return;
  await channel.messages
    .fetch(sticky.lastMessageId)
    .then((msg) => msg.delete())
    .catch(() => null);
}
