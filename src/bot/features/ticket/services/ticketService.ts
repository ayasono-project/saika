// src/bot/features/ticket/services/ticketService.ts
// チケット操作のビジネスロジック

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Guild,
  OverwriteType,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import type {
  ITicketRepository,
  Ticket,
} from "../../../../shared/database/types";
import { ValidationError } from "../../../../shared/errors/customErrors";
import type { TicketConfigService } from "../../../../shared/features/ticket/ticketConfigService";
import { tDefault } from "../../../../shared/locale/localeManager";
import { createInfoEmbed } from "../../../utils/messageResponse";
import {
  parseStaffRoleIds,
  TICKET_CUSTOM_ID,
  TICKET_MESSAGE_FETCH_LIMIT,
  TICKET_STATUS,
} from "../commands/ticketCommand.constants";
import {
  cancelTicketAutoDelete,
  scheduleTicketAutoDelete,
} from "./ticketAutoDeleteService";

/**
 * チケットチャンネルを作成する
 * @param guild 対象ギルド
 * @param categoryId カテゴリID
 * @param userId チケット作成者のユーザーID
 * @param subject チケットの件名
 * @param detail チケットの詳細
 * @param configService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @returns 作成されたチケットとチャンネル
 */
export async function createTicketChannel(
  guild: Guild,
  categoryId: string,
  userId: string,
  subject: string,
  detail: string,
  configService: TicketConfigService,
  ticketRepository: ITicketRepository,
): Promise<{ ticket: Ticket; channel: TextChannel }> {
  const config = await configService.findByGuildAndCategory(
    guild.id,
    categoryId,
  );
  if (!config) {
    throw new ValidationError(
      tDefault("ticket:user-response.config_not_found"),
    );
  }

  const staffRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);

  // カウンターをインクリメント
  const ticketNumber = await configService.incrementCounter(
    guild.id,
    categoryId,
  );

  // チャンネルを作成
  const channel = await guild.channels.create({
    name: `ticket-${ticketNumber}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: userId,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      ...staffRoleIds.map((roleId) => ({
        id: roleId,
        type: OverwriteType.Role as const,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ] as const,
      })),
      ...(guild.client.user
        ? [
            {
              id: guild.client.user.id,
              type: OverwriteType.Member as const,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
              ] as const,
            },
          ]
        : []),
    ],
  });

  // DB にチケットを保存
  const ticket = await ticketRepository.create({
    guildId: guild.id,
    categoryId,
    channelId: channel.id,
    userId,
    ticketNumber,
    subject,
    status: TICKET_STATUS.OPEN,
    elapsedDeleteMs: 0,
    closedAt: null,
  });

  // 初期メッセージを送信
  const createdAtTimestamp = Math.floor(Date.now() / 1000);
  const createdAtFormatted = `<t:${createdAtTimestamp}:f>`;

  const embed = new EmbedBuilder()
    .setTitle(tDefault("ticket:embed.title.ticket", { subject }))
    .setDescription(detail)
    .addFields(
      {
        name: tDefault("ticket:embed.field.name.created_by"),
        value: `<@${userId}>`,
        inline: true,
      },
      {
        name: tDefault("ticket:embed.field.name.created_at"),
        value: createdAtFormatted,
        inline: true,
      },
    )
    .setColor(Number.parseInt(config.panelColor.slice(1), 16));

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.CLOSE_PREFIX}${ticket.id}`)
      .setEmoji("🔒")
      .setLabel(tDefault("ticket:ui.button.close"))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_PREFIX}${ticket.id}`)
      .setEmoji("🗑️")
      .setLabel(tDefault("ticket:ui.button.delete"))
      .setStyle(ButtonStyle.Danger),
  );

  // 作成者とスタッフロールへのメンションを送信（通知目的）
  const mentions = [
    `<@${userId}>`,
    ...staffRoleIds.map((roleId) => `<@&${roleId}>`),
  ].join(" ");
  await channel.send(mentions).catch(() => null);

  await channel.send({ embeds: [embed], components: [buttons] });

  return { ticket, channel };
}

/**
 * チケットをクローズする
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param configService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 */
export async function closeTicket(
  ticket: Ticket,
  guild: Guild,
  configService: TicketConfigService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  if (!config) return;

  const staffRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);
  const channel = (await guild.channels
    .fetch(ticket.channelId)
    .catch(() => null)) as TextChannel | null;

  if (channel) {
    // 作成者の SendMessages を拒否
    await channel.permissionOverwrites
      .edit(ticket.userId, { SendMessages: false })
      .catch(() => null);
    // スタッフロールの SendMessages を拒否
    for (const roleId of staffRoleIds) {
      await channel.permissionOverwrites
        .edit(roleId, { SendMessages: false })
        .catch(() => null);
    }
  }

  const now = new Date();
  // チケットステータスを更新
  await ticketRepository.update(ticket.id, {
    status: TICKET_STATUS.CLOSED,
    closedAt: now,
  });

  // 自動削除タイマーを開始
  const autoDeleteMs = config.autoDeleteDays * 24 * 60 * 60 * 1000;
  const remainingMs = autoDeleteMs - ticket.elapsedDeleteMs;
  const autoDeleteTimestamp = Math.floor((Date.now() + remainingMs) / 1000);

  scheduleTicketAutoDelete(
    ticket.id,
    ticket.channelId,
    ticket.guildId,
    remainingMs,
    guild.client,
  );

  // 前回の再オープン通知を削除（ボタンなし embed のみ対象）
  if (channel) {
    await deleteReopenNotification(channel, guild);
  }

  // クローズ通知を送信
  if (channel) {
    const description = `${tDefault("ticket:embed.description.closed")}\n${tDefault("ticket:embed.description.auto_delete", { timestamp: String(autoDeleteTimestamp) })}`;
    const embed = createInfoEmbed(description, {
      title: tDefault("ticket:embed.title.closed"),
    });

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_CUSTOM_ID.OPEN_PREFIX}${ticket.id}`)
        .setEmoji("🔓")
        .setLabel(tDefault("ticket:ui.button.reopen"))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${TICKET_CUSTOM_ID.DELETE_PREFIX}${ticket.id}`)
        .setEmoji("🗑️")
        .setLabel(tDefault("ticket:ui.button.delete"))
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds: [embed], components: [buttons] });
  }
}

/**
 * チケットを再オープンする
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param configService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 */
export async function reopenTicket(
  ticket: Ticket,
  guild: Guild,
  configService: TicketConfigService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  if (!config) return;

  const staffRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);
  const channel = (await guild.channels
    .fetch(ticket.channelId)
    .catch(() => null)) as TextChannel | null;

  // 自動削除タイマーをキャンセルし、経過時間を保持
  cancelTicketAutoDelete(ticket.id, ticket.guildId);

  let newElapsedMs = ticket.elapsedDeleteMs;
  if (ticket.closedAt) {
    newElapsedMs += Date.now() - ticket.closedAt.getTime();
  }

  if (channel) {
    // 作成者の SendMessages を許可
    await channel.permissionOverwrites
      .edit(ticket.userId, { SendMessages: true })
      .catch(() => null);
    // スタッフロールの SendMessages を許可
    for (const roleId of staffRoleIds) {
      await channel.permissionOverwrites
        .edit(roleId, { SendMessages: true })
        .catch(() => null);
    }
  }

  // チケットステータスを更新
  await ticketRepository.update(ticket.id, {
    status: TICKET_STATUS.OPEN,
    elapsedDeleteMs: newElapsedMs,
    closedAt: null,
  });

  // 前回のクローズ通知を削除（再オープンボタンを含むメッセージが対象）
  if (channel) {
    await deleteCloseNotification(channel, guild);
  }

  // 再オープン通知を送信（クローズ・削除ボタン付き）
  if (channel) {
    const embed = createInfoEmbed(
      tDefault("ticket:embed.description.reopened"),
      { title: tDefault("ticket:embed.title.reopened") },
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_CUSTOM_ID.CLOSE_PREFIX}${ticket.id}`)
        .setEmoji("🔒")
        .setLabel(tDefault("ticket:ui.button.close"))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${TICKET_CUSTOM_ID.DELETE_PREFIX}${ticket.id}`)
        .setEmoji("🗑️")
        .setLabel(tDefault("ticket:ui.button.delete"))
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds: [embed], components: [buttons] });
  }
}

/**
 * チケットを削除する
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 */
export async function deleteTicket(
  ticket: Ticket,
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<void> {
  // 自動削除タイマーをキャンセル
  cancelTicketAutoDelete(ticket.id, ticket.guildId);

  // DB からチケットを削除
  await ticketRepository.delete(ticket.id);

  // チャンネルを削除
  const channel = await guild.channels
    .fetch(ticket.channelId)
    .catch(() => null);
  if (channel) {
    await channel.delete().catch(() => null);
  }
}

/**
 * ユーザーがチケットの操作権限を持っているか確認する
 * （チケット作成者 or スタッフロール）
 * @param ticket 対象チケット
 * @param userId 操作ユーザーのID
 * @param memberRoleIds ユーザーが持つロールIDの配列
 * @param staffRoleIds スタッフロールIDの配列
 * @returns 操作権限を持っている場合 true
 */
export function hasTicketPermission(
  ticket: Ticket,
  userId: string,
  memberRoleIds: string[],
  staffRoleIds: string[],
): boolean {
  if (ticket.userId === userId) return true;
  return memberRoleIds.some((roleId) => staffRoleIds.includes(roleId));
}

/**
 * ユーザーがスタッフロールを持っているか確認する
 * @param memberRoleIds ユーザーが持つロールIDの配列
 * @param staffRoleIds スタッフロールIDの配列
 * @returns スタッフロールを持っている場合 true
 */
export function hasStaffRole(
  memberRoleIds: string[],
  staffRoleIds: string[],
): boolean {
  return memberRoleIds.some((roleId) => staffRoleIds.includes(roleId));
}

/**
 * 前回の再オープン通知（ボタンなし embed）を検索して削除する
 * クローズ時に呼ばれる。初期メッセージ（ボタン付き）には触れない
 * @param channel 対象テキストチャンネル
 * @param guild 対象ギルド
 */
async function deleteReopenNotification(
  channel: TextChannel,
  guild: Guild,
): Promise<void> {
  const messages = await channel.messages
    .fetch({ limit: TICKET_MESSAGE_FETCH_LIMIT })
    .catch(() => null);
  if (!messages) return;

  const botUserId = guild.client.user?.id;
  if (!botUserId) return;

  const reopenedTitle = tDefault("ticket:embed.title.reopened");
  for (const msg of messages.values()) {
    if (msg.author.id !== botUserId) continue;
    if (msg.embeds.length > 0) {
      const embedTitle = msg.embeds[0]?.title ?? "";
      if (embedTitle.includes(reopenedTitle)) {
        await msg.delete().catch(() => null);
        return;
      }
    }
  }
}

/**
 * 前回のクローズ通知（再オープンボタン付き）を検索して削除する
 * 再オープン時に呼ばれる。初期メッセージ（クローズボタン付き）には触れない
 * @param channel 対象テキストチャンネル
 * @param guild 対象ギルド
 */
async function deleteCloseNotification(
  channel: TextChannel,
  guild: Guild,
): Promise<void> {
  const messages = await channel.messages
    .fetch({ limit: TICKET_MESSAGE_FETCH_LIMIT })
    .catch(() => null);
  if (!messages) return;

  const botUserId = guild.client.user?.id;
  if (!botUserId) return;

  for (const msg of messages.values()) {
    if (msg.author.id !== botUserId) continue;
    if (msg.components.length > 0) {
      const hasReopenButton = msg.components.some(
        (row) =>
          "components" in row &&
          (row.components as { customId?: string }[]).some((c) =>
            c.customId?.startsWith(TICKET_CUSTOM_ID.OPEN_PREFIX),
          ),
      );
      if (hasReopenButton) {
        await msg.delete().catch(() => null);
        return;
      }
    }
  }
}
