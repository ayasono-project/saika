// チケット操作のビジネスロジック

import { ValidationError } from "@ayasono/shared/core";
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
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import type {
  GuildTicketSettings,
  ITicketRepository,
  Ticket,
} from "../../../shared/database/types";
import { logPrefixed, tDefault } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  TICKET_CUSTOM_ID,
  TICKET_MESSAGE_FETCH_LIMIT,
  TICKET_STATUS,
} from "../commands/ticketCommand.constants";
import type { TicketSettingsService } from "../ticketSettingsService";
import {
  cancelTicketAutoDelete,
  scheduleTicketAutoDelete,
} from "./ticketAutoDeleteService";
import { computeAutoDeleteRemainingMs } from "./ticketAutoDeleteTime";

/**
 * チケットのカテゴリの設定を取得する。無ければ ValidationError を投げる
 * 呼び出し側（コマンド・ボタン）は事前に findTicketConfigOrReply で確かめているが、その後に
 * 設定が消された場合でも、何もせずに成功扱いで戻らないようにする
 * @param ticket 対象チケット
 * @param settingsService チケット設定サービス
 * @returns カテゴリの設定
 */
async function requireTicketConfig(
  ticket: Ticket,
  settingsService: TicketSettingsService,
): Promise<GuildTicketSettings> {
  const config = await settingsService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  if (!config) {
    throw ValidationError.fromKey("ticket:user-response.ticket_config_missing");
  }
  return config;
}

/**
 * チケットチャンネルを作成する
 * @param guild 対象ギルド
 * @param categoryId カテゴリID
 * @param userId チケット作成者のユーザーID
 * @param subject チケットの件名
 * @param detail チケットの詳細
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @returns 作成されたチケットとチャンネル
 */
export async function createTicketChannel(
  guild: Guild,
  categoryId: string,
  userId: string,
  subject: string,
  detail: string,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<{ ticket: Ticket; channel: TextChannel }> {
  const config = await settingsService.findByGuildAndCategory(
    guild.id,
    categoryId,
  );
  if (!config) {
    throw new ValidationError(
      tDefault("ticket:user-response.config_not_found"),
    );
  }

  const staffRoleIds: string[] = config.staffRoleIds;

  // カウンターをインクリメント
  const ticketNumber = await settingsService.incrementCounter(
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
              // Bot 自身への overwrite はチャンネル運用に必要な非昇格ビットのみ。
              // ManageChannels / ManageRoles はギルド全体で既に保持しているため
              // overwrite に含めない（Administrator なし Bot が overwrite で昇格ビットを
              // 付与しようとすると 403 Missing Permissions になるため）。
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.EmbedLinks,
              ] as const,
            },
          ]
        : []),
    ],
  });

  // DB にチケットを保存。失敗したら作ったチャンネルを消してから失敗を返す
  // （記録の無いチャンネルは、クローズも削除も自動削除もできないまま残るため）
  let ticket: Ticket;
  try {
    ticket = await ticketRepository.create({
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
  } catch (error) {
    await channel.delete().catch((deleteError: unknown) => {
      logger.warn(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.unrecorded_channel_delete_failed",
          { guildId: guild.id, channelId: channel.id },
        ),
        deleteError,
      );
    });
    throw error;
  }

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
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @throws ValidationError カテゴリの設定が無い（パネルが削除された）場合
 */
export async function closeTicket(
  ticket: Ticket,
  guild: Guild,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await requireTicketConfig(ticket, settingsService);

  const staffRoleIds: string[] = config.staffRoleIds;
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

  // 自動削除タイマーを開始（今クローズしたので、今回のクローズからの経過時間は数えない）
  const remainingMs = computeAutoDeleteRemainingMs(
    config.autoDeleteDays,
    ticket.elapsedDeleteMs,
    null,
    now.getTime(),
  );
  const autoDeleteTimestamp = Math.floor((now.getTime() + remainingMs) / 1000);

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
 * クローズしていた時間は elapsedDeleteMs に足して保存する（保存時に列の上限で切り詰める）
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @throws ValidationError カテゴリの設定が無い（パネルが削除された）場合
 */
export async function reopenTicket(
  ticket: Ticket,
  guild: Guild,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await requireTicketConfig(ticket, settingsService);

  const staffRoleIds: string[] = config.staffRoleIds;
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
