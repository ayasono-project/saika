// src/api/features/ticketResource.ts
// チケットパネルの契約マッピングと Discord パネルの投稿/編集/削除の副作用。
// パネル UI は ticket コマンドのインライン構築相当を再現する（discord.js は投稿時のみ動的 import）。

import type { TicketPanel as ContractTicket } from "@ayasono/shared/api";
import type { BotClient } from "../../bot/client";
import type { GuildTicketSettings } from "../../shared/database/types/ticketTypes";

/** ドメイン設定 + オープン件数 → 契約（id は識別キーの categoryId） */
export function toContractTicket(
  domain: GuildTicketSettings,
  openCount: number,
): ContractTicket {
  return {
    id: domain.categoryId,
    categoryId: domain.categoryId,
    channelId: domain.panelChannelId || null,
    staffRoleIds: domain.staffRoleIds,
    title: domain.panelTitle,
    description: domain.panelDescription,
    color: domain.panelColor,
    autoDeleteDays: domain.autoDeleteDays,
    maxTicketsPerUser: domain.maxTicketsPerUser,
    openCount,
  };
}

/** パネルの Embed + 作成ボタン行を構築する（discord.js / 定数 / ロケールを動的 import） */
async function buildTicketPanel(
  guildId: string,
  categoryId: string,
  title: string,
  description: string,
  color: string,
) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } =
    await import("discord.js");
  const { TICKET_CUSTOM_ID } = await import(
    "../../features/ticket/commands/ticketCommand.constants"
  );
  const { tGuild } = await import("../../shared/locale/localeManager");

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(Number.parseInt(color.slice(1), 16));
  const label = await tGuild(guildId, "ticket:ui.button.create_ticket");
  const row = new ActionRowBuilder<
    InstanceType<typeof ButtonBuilder>
  >().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.CREATE_PREFIX}${categoryId}`)
      .setEmoji("🎫")
      .setLabel(label)
      .setStyle(ButtonStyle.Primary),
  );
  return { embed, row };
}

/** パネルをチャンネルへ投稿し messageId を返す（送信不可なら空文字） */
export async function postTicketPanel(
  client: BotClient,
  guildId: string,
  domain: GuildTicketSettings,
): Promise<string> {
  const channel = await client.channels
    .fetch(domain.panelChannelId)
    .catch(() => null);
  if (!channel?.isSendable()) return "";
  const { embed, row } = await buildTicketPanel(
    guildId,
    domain.categoryId,
    domain.panelTitle,
    domain.panelDescription,
    domain.panelColor,
  );
  const sent = await channel.send({ embeds: [embed], components: [row] });
  return sent.id;
}

/** 既存パネルメッセージを再構築して編集する（best-effort） */
export async function editTicketPanel(
  client: BotClient,
  guildId: string,
  domain: GuildTicketSettings,
): Promise<void> {
  if (!domain.panelMessageId) return;
  const channel = await client.channels
    .fetch(domain.panelChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = await channel.messages
    .fetch(domain.panelMessageId)
    .catch(() => null);
  if (!message) return;
  const { embed, row } = await buildTicketPanel(
    guildId,
    domain.categoryId,
    domain.panelTitle,
    domain.panelDescription,
    domain.panelColor,
  );
  await message.edit({ embeds: [embed], components: [row] }).catch(() => null);
}

/** パネルメッセージを削除する（best-effort） */
export async function deleteTicketPanel(
  client: BotClient,
  domain: GuildTicketSettings,
): Promise<void> {
  if (!domain.panelMessageId) return;
  const channel = await client.channels
    .fetch(domain.panelChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.messages
    .fetch(domain.panelMessageId)
    .then((msg) => msg.delete())
    .catch(() => null);
}
