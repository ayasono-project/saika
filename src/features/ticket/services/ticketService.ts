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
  TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  TICKET_CHANNEL_BOT_PERMISSIONS,
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
import {
  getTicketChannelAccess,
  requireHandleableTicketChannel,
  toBotChannelAccessMessageKey,
} from "./ticketChannelAccess";

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
 * オープン中のチケットに付ける操作ボタン（クローズ・削除）の行を作る
 * 作成時の初期メッセージと、再オープンの通知で使う
 * @param ticketId チケットID
 * @returns ボタンの行
 */
function buildOpenTicketButtons(
  ticketId: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.CLOSE_PREFIX}${ticketId}`)
      .setEmoji("🔒")
      .setLabel(tDefault("ticket:ui.button.close"))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_PREFIX}${ticketId}`)
      .setEmoji("🗑️")
      .setLabel(tDefault("ticket:ui.button.delete"))
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * 作成者とスタッフロールの「メッセージを送信」を、チャンネルの上書きで許可または拒否する
 * 失敗しても続ける（クローズ・再オープンそのものは、記録と通知で成り立つため）
 * @param channel チケットのチャンネル
 * @param ticket 対象チケット
 * @param staffRoleIds スタッフロールIDの配列
 * @param allowed 許可するなら true、拒否するなら false
 * @returns 実行完了を示す Promise
 */
async function setTicketSendMessages(
  channel: TextChannel,
  ticket: Ticket,
  staffRoleIds: string[],
  allowed: boolean,
): Promise<void> {
  for (const targetId of [ticket.userId, ...staffRoleIds]) {
    await channel.permissionOverwrites
      .edit(targetId, { SendMessages: allowed })
      .catch(() => null);
  }
}

/**
 * 通知を送ってから記録を更新する。更新に失敗したら、送った通知を消してから失敗を返す
 *
 * チャンネルの操作（通知）を先に行うのは、そちらの方が失敗しやすいため。記録を先に変えると、
 * 通知に失敗したときに「記録はクローズなのにチャンネルは開いたまま」のような食い違いが残る
 * @param channel チケットのチャンネル
 * @param notification 送る通知
 * @param update 記録の更新
 * @returns 実行完了を示す Promise
 */
async function sendNotificationThenUpdate(
  channel: TextChannel,
  notification: Parameters<TextChannel["send"]>[0],
  update: () => Promise<unknown>,
): Promise<void> {
  const sent = await channel.send(notification);
  try {
    await update();
  } catch (error) {
    await sent.delete().catch(() => null);
    throw error;
  }
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
              // クローズ等の前の確認（ticketChannelAccess）も同じ権限で判定する
              allow: TICKET_CHANNEL_BOT_PERMISSIONS,
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

  const buttons = buildOpenTicketButtons(ticket.id);

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
 *
 * 状態を変える前に Bot がチャンネルを扱えるか確かめ、扱えなければ何も変えずに止める。
 * 扱えるときは、クローズ通知を送ってから記録をクローズにし（sendNotificationThenUpdate）、
 * その後で自動削除を予約し、作成者・スタッフの送信を止め、前回の再オープン通知を消す
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @throws ValidationError カテゴリの設定が無い（パネルが削除された）場合、または Bot がチャンネルを扱えない場合
 */
export async function closeTicket(
  ticket: Ticket,
  guild: Guild,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await requireTicketConfig(ticket, settingsService);
  const channel = await requireHandleableTicketChannel(guild, ticket);

  // 自動削除までの時間（今クローズするので、今回のクローズからの経過時間は数えない）
  const now = new Date();
  const remainingMs = computeAutoDeleteRemainingMs(
    config.autoDeleteDays,
    ticket.elapsedDeleteMs,
    null,
    now.getTime(),
  );
  const autoDeleteTimestamp = Math.floor((now.getTime() + remainingMs) / 1000);

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

  // クローズ通知を送ってから、チケットステータスを更新
  await sendNotificationThenUpdate(
    channel,
    { embeds: [embed], components: [buttons] },
    () =>
      ticketRepository.update(ticket.id, {
        status: TICKET_STATUS.CLOSED,
        closedAt: now,
      }),
  );

  // 記録をクローズにしてから自動削除タイマーを開始（発火時は記録がクローズ済みのときだけ消す）
  scheduleTicketAutoDelete(
    ticket.id,
    ticket.channelId,
    ticket.guildId,
    remainingMs,
    guild.client,
  );

  // 作成者とスタッフロールの SendMessages を拒否
  await setTicketSendMessages(channel, ticket, config.staffRoleIds, false);

  // 前回の再オープン通知を削除（ボタンなし embed のみ対象）
  await deleteReopenNotification(channel, guild);
}

/**
 * チケットを再オープンする
 * クローズしていた時間は elapsedDeleteMs に足して保存する（保存時に列の上限で切り詰める）
 *
 * 状態を変える前に Bot がチャンネルを扱えるか確かめ、扱えなければ何も変えずに止める。
 * 扱えるときは、再オープン通知を送ってから記録をオープンにし（sendNotificationThenUpdate）、
 * その後で自動削除タイマーを取り消し、作成者・スタッフの送信を戻し、前回のクローズ通知を消す。
 * タイマーを記録より先に取り消すと、途中で失敗したときにクローズのまま自動削除されなくなるため
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @throws ValidationError カテゴリの設定が無い（パネルが削除された）場合、または Bot がチャンネルを扱えない場合
 */
export async function reopenTicket(
  ticket: Ticket,
  guild: Guild,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const config = await requireTicketConfig(ticket, settingsService);
  const channel = await requireHandleableTicketChannel(guild, ticket);

  // クローズしていた時間を経過時間に足す
  let newElapsedMs = ticket.elapsedDeleteMs;
  if (ticket.closedAt) {
    newElapsedMs += Date.now() - ticket.closedAt.getTime();
  }

  const embed = createInfoEmbed(tDefault("ticket:embed.description.reopened"), {
    title: tDefault("ticket:embed.title.reopened"),
  });

  // 再オープン通知（クローズ・削除ボタン付き）を送ってから、チケットステータスを更新
  await sendNotificationThenUpdate(
    channel,
    { embeds: [embed], components: [buildOpenTicketButtons(ticket.id)] },
    () =>
      ticketRepository.update(ticket.id, {
        status: TICKET_STATUS.OPEN,
        elapsedDeleteMs: newElapsedMs,
        closedAt: null,
      }),
  );

  // 記録をオープンにしてから自動削除タイマーをキャンセル
  cancelTicketAutoDelete(ticket.id, ticket.guildId);

  // 作成者とスタッフロールの SendMessages を許可
  await setTicketSendMessages(channel, ticket, config.staffRoleIds, true);

  // 前回のクローズ通知を削除（再オープンボタンを含むメッセージが対象）
  await deleteCloseNotification(channel, guild);
}

/**
 * チケットを削除する
 *
 * 記録を消す前に Bot がチャンネルを扱えて、消す権限（「チャンネルの管理」）もあるか確かめ、
 * どちらかが無ければ何も変えずに止める（記録だけが消えてチャンネルが残ると、Bot からは二度と操作できないため）。
 * チャンネルが既に無いと確定したときは、記録とタイマーだけを片付ける
 * @param ticket 対象チケット
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 * @throws ValidationError Bot がチャンネルを扱えない、または「チャンネルの管理」が無い場合
 */
export async function deleteTicket(
  ticket: Ticket,
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const access = await getTicketChannelAccess(
    guild,
    ticket.channelId,
    TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  );
  if (access.status === "inaccessible") {
    throw ValidationError.fromKey(toBotChannelAccessMessageKey(access));
  }

  // 自動削除タイマーをキャンセル
  cancelTicketAutoDelete(ticket.id, ticket.guildId);

  // DB からチケットを削除（先に消すので、チャンネル削除の channelDelete では記録が見つからない）
  await ticketRepository.delete(ticket.id);

  // チャンネルを削除
  if (access.status === "handleable") {
    await access.channel.delete().catch((error: unknown) => {
      logger.warn(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.ticket_channel_delete_failed",
          { guildId: ticket.guildId, channelId: ticket.channelId },
        ),
        error,
      );
    });
  }
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
