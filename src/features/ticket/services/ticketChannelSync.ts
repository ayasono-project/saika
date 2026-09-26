// チケットの記録と Discord 上のチャンネルの突き合わせ（Bot が見ていない間の変化の後始末）

import type { Client, Guild } from "discord.js";
import type { ITicketRepository, Ticket } from "../../../shared/database/types";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  cancelTicketAutoDelete,
  restoreAutoDeleteTimers,
  restoreAutoDeleteTimersForGuild,
} from "./ticketAutoDeleteService";

/**
 * ギルドのチケットのうち、チャンネルが既に無いものの記録と自動削除タイマーを片付ける
 *
 * Bot の停止中や、サーバーから外されていた間に消されたチャンネルは channelDelete が届かず、
 * 記録が残り続ける。オープン中のチケットが残ると、作成者は同時作成の上限に達したまま新しい
 * チケットを作れない。チャンネル一覧の取得に失敗したときは、存在しないと誤判定しないよう何も消さない。
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 * @returns 片付けたチケットの件数
 */
export async function removeTicketsWithMissingChannels(
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<number> {
  let tickets: Ticket[];
  let existingChannelIds: Set<string>;
  try {
    tickets = await ticketRepository.findAllByGuild(guild.id);
    if (tickets.length === 0) return 0;
    // 一括取得（GET /guilds/{id}/channels）は閲覧権限に関係なくギルドの全チャンネルを返す
    const channels = await guild.channels.fetch();
    existingChannelIds = new Set(channels.keys());
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_channel_sync_failed",
        { guildId: guild.id },
      ),
      error,
    );
    return 0;
  }

  let removedCount = 0;
  for (const ticket of tickets) {
    if (existingChannelIds.has(ticket.channelId)) continue;
    try {
      cancelTicketAutoDelete(ticket.id, guild.id);
      await ticketRepository.delete(ticket.id);
      removedCount++;
    } catch (error) {
      logger.error(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.ticket_channel_cleanup_failed",
          { guildId: guild.id, channelId: ticket.channelId },
        ),
        error,
      );
    }
  }

  if (removedCount > 0) {
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.missing_channel_tickets_removed",
        { guildId: guild.id, count: String(removedCount) },
      ),
    );
  }
  return removedCount;
}

/**
 * 1ギルド分のチケットを Discord の状態に合わせる
 * チャンネルが無いものを片付けてから、残ったクローズ済みチケットの自動削除タイマーを組み直す。
 * 猶予内の再導入で、退出時に止めたタイマーと不在中に消されたチャンネルの両方を戻すために使う。
 * 再接続後（guildAvailable）にも使う。予約済みのタイマーは組み直さないので、繰り返し呼んでもよい
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function syncGuildTickets(
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<void> {
  await removeTicketsWithMissingChannels(guild, ticketRepository);
  const restoredCount = await restoreAutoDeleteTimersForGuild(
    guild.id,
    guild.client,
    ticketRepository,
  );
  if (restoredCount > 0) {
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_restore_guild",
        { guildId: guild.id, count: String(restoredCount) },
      ),
    );
  }
}

/**
 * 再接続でギルドが戻ったとき（guildAvailable）に、そのギルドのチケットを Discord の状態に合わせる
 * セッションが無効になり再 IDENTIFY で戻った場合、切断中に消されたチャンネルの channelDelete は
 * 再送されない。そのまま次の再起動まで待つと、作成者が同時作成の上限に達したまま新しいチケットを
 * 作れないため。失敗してもログに残すだけにする（次の再接続か再起動で再び合わせる）
 * @param guild 戻ってきたギルド
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function syncGuildTicketsOnAvailable(
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<void> {
  try {
    await syncGuildTickets(guild, ticketRepository);
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.guild_resync_failed",
        { guildId: guild.id },
      ),
      error,
    );
  }
}

/**
 * Bot 起動時に全ギルドのチケットを Discord の状態に合わせる
 * 停止中に消されたチャンネルのチケットを片付けてから、自動削除タイマーを復元する
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function syncTicketsOnStartup(
  client: Client,
  ticketRepository: ITicketRepository,
): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await removeTicketsWithMissingChannels(guild, ticketRepository);
  }
  await restoreAutoDeleteTimers(client, ticketRepository);
}
