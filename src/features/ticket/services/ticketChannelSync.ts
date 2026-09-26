// チケットの記録と Discord 上のチャンネルの突き合わせ（Bot が見ていない間の変化の後始末）

import type {
  Client,
  Collection,
  Guild,
  NonThreadGuildBasedChannel,
} from "discord.js";
import { notifyWarnChannel } from "../../../bot/shared/errorChannelNotifier";
import type { ITicketRepository, Ticket } from "../../../shared/database/types";
import {
  type GuildTFunction,
  getGuildTranslator,
} from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TICKET_LIST_MAX_DISPLAY } from "../commands/ticketCommand.constants";
import {
  cancelTicketAutoDelete,
  restoreAutoDeleteTimers,
  restoreAutoDeleteTimersForGuild,
} from "./ticketAutoDeleteService";
import {
  canBotHandleTicketChannel,
  resolveBotMember,
} from "./ticketChannelAccess";

/**
 * チケットの記録とチャンネルの突き合わせの結果
 */
export interface TicketChannelReconcileResult {
  /** チャンネルが無かったため片付けたチケットの件数 */
  removedCount: number;
  /** チャンネルはあるが、Bot が扱えないチケット */
  inaccessibleTickets: Ticket[];
}

/**
 * syncGuildTickets の動作の指定
 */
interface SyncGuildTicketsOptions {
  /**
   * Bot が扱えないチケットのチャンネルがあれば、エラー通知チャンネルに知らせる。
   * Bot を入れ直したとき（guildCreate）だけ立てる。再接続（guildAvailable）のたびに知らせると騒がしいため
   */
  notifyInaccessibleChannels?: boolean;
}

/**
 * syncGuildTickets の結果
 * 呼び出し側（guildCreate）は、扱えないチケットがあるのにエラー通知チャンネルへ届かなかったとき、
 * オーナー宛の DM で代わりに知らせる
 */
export interface SyncGuildTicketsResult {
  /** チャンネルはあるが、Bot が扱えないチケットの件数 */
  inaccessibleCount: number;
  /** Bot が扱えないチケットを、エラー通知チャンネルへ届けられたか（知らせる指定が無い・対象が無いときは false） */
  notified: boolean;
}

/**
 * ギルドのチケットを Discord のチャンネルと突き合わせる
 *
 * - チャンネルが既に無いチケットは、記録と自動削除タイマーを片付ける。Bot の停止中や、サーバーから
 *   外されていた間に消されたチャンネルは channelDelete が届かず、記録が残り続ける。オープン中のチケットが
 *   残ると、作成者は同時作成の上限に達したまま新しいチケットを作れない
 * - チャンネルはあるが Bot が扱えないチケット（Bot を外して入れ直すと、それより前に作ったチケットの
 *   チャンネルから Bot 自身への上書きが消える）は、warn を出して結果で返す（記録は消さない）
 *
 * チャンネル一覧の取得に失敗したときは、存在しないと誤判定しないよう何も消さない
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 * @returns 片付けた件数と、Bot が扱えないチケット
 */
export async function reconcileTicketChannels(
  guild: Guild,
  ticketRepository: ITicketRepository,
): Promise<TicketChannelReconcileResult> {
  const result: TicketChannelReconcileResult = {
    removedCount: 0,
    inaccessibleTickets: [],
  };
  let tickets: Ticket[];
  let channels: Collection<string, NonThreadGuildBasedChannel | null>;
  try {
    tickets = await ticketRepository.findAllByGuild(guild.id);
    if (tickets.length === 0) return result;
    // 一括取得（GET /guilds/{id}/channels）は閲覧権限に関係なくギルドの全チャンネルを、上書きも含めて返す
    channels = await guild.channels.fetch();
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_channel_sync_failed",
        { guildId: guild.id },
      ),
      error,
    );
    return result;
  }

  // Bot 自身のメンバーが取れなければ、扱えるかどうかは判定しない（扱えないと誤って知らせないため）
  const me = await resolveBotMember(guild);

  for (const ticket of tickets) {
    if (channels.has(ticket.channelId)) {
      const channel = channels.get(ticket.channelId);
      if (channel && me && !canBotHandleTicketChannel(channel, me)) {
        result.inaccessibleTickets.push(ticket);
      }
      continue;
    }
    try {
      cancelTicketAutoDelete(ticket.id, guild.id);
      await ticketRepository.delete(ticket.id);
      result.removedCount++;
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

  if (result.removedCount > 0) {
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.missing_channel_tickets_removed",
        { guildId: guild.id, count: String(result.removedCount) },
      ),
    );
  }
  if (result.inaccessibleTickets.length > 0) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.inaccessible_ticket_channels_found",
        {
          guildId: guild.id,
          count: String(result.inaccessibleTickets.length),
          channelIds: result.inaccessibleTickets
            .map((ticket) => ticket.channelId)
            .join(","),
        },
      ),
    );
  }
  return result;
}

/**
 * Bot が扱えないチケットのチャンネルを知らせる文面を作る
 * 対象のチャンネル（多ければ先頭の TICKET_LIST_MAX_DISPLAY 件と残りの件数）と、付け直す手順を載せる。
 * 警告通知の詳細欄（1024文字まで）に収まる長さにする
 * @param t 通知先のサーバーの言語の翻訳関数
 * @param tickets Bot が扱えないチケット（1件以上）
 * @returns 通知の本文
 */
export function buildInaccessibleTicketChannelsNotice(
  t: GuildTFunction,
  tickets: Ticket[],
): string {
  const mentions = tickets
    .slice(0, TICKET_LIST_MAX_DISPLAY)
    .map((ticket) => `<#${ticket.channelId}>`);
  const hiddenCount = tickets.length - mentions.length;
  if (hiddenCount > 0) {
    mentions.push(t("ticket:user-response.and_more", { count: hiddenCount }));
  }
  return t("ticket:embed.field.value.channel_access_missing_notice", {
    count: tickets.length,
    channels: mentions.join(" "),
  });
}

/**
 * Bot が扱えないチケットのチャンネルを、エラー通知チャンネルにまとめて1回知らせる
 * 文面はサーバーの言語で出す（エラー通知チャンネルが未設定なら notifyWarnChannel が何もしない）
 * @param guild 対象ギルド
 * @param tickets Bot が扱えないチケット（1件以上）
 * @returns エラー通知チャンネルへ届けられたときだけ true（未設定・Bot が入れない等は false）
 */
async function notifyInaccessibleTicketChannels(
  guild: Guild,
  tickets: Ticket[],
): Promise<boolean> {
  const t = await getGuildTranslator(guild.id);
  return notifyWarnChannel(
    guild,
    buildInaccessibleTicketChannelsNotice(t, tickets),
    {
      feature: t("ticket:embed.field.value.error_notification_feature"),
      action: t("ticket:embed.field.value.channel_access_missing_action"),
    },
  );
}

/**
 * 1ギルド分のチケットを Discord の状態に合わせる
 * チャンネルが無いものを片付けてから、残ったクローズ済みチケットの自動削除タイマーを組み直す。
 * 猶予内の再導入で、退出時に止めたタイマーと不在中に消されたチャンネルの両方を戻すために使う。
 * 再接続後（guildAvailable）にも使う。予約済みのタイマーは組み直さないので、繰り返し呼んでもよい。
 * 再導入のときは notifyInaccessibleChannels を立て、Bot が扱えないチケットのチャンネルを管理者に知らせる。
 * キックで Bot の管理ロールも消えるため、管理者専用のエラー通知チャンネルには Bot も入れず、届かないことがある。
 * 届いたかどうかを返し、届かなかったときの代わりの連絡（オーナー宛 DM）は呼び出し側に任せる
 * @param guild 対象ギルド
 * @param ticketRepository チケットリポジトリ
 * @param options notifyInaccessibleChannels で、Bot が扱えないチャンネルの通知を出すかを決める
 * @returns Bot が扱えないチケットの件数と、エラー通知チャンネルへ届けられたか
 */
export async function syncGuildTickets(
  guild: Guild,
  ticketRepository: ITicketRepository,
  options: SyncGuildTicketsOptions = {},
): Promise<SyncGuildTicketsResult> {
  const { inaccessibleTickets } = await reconcileTicketChannels(
    guild,
    ticketRepository,
  );

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

  // 通知はタイマーの組み直しの後に出す（通知の準備で失敗しても、組み直しは済ませておくため）
  const notified =
    options.notifyInaccessibleChannels === true &&
    inaccessibleTickets.length > 0 &&
    (await notifyInaccessibleTicketChannels(guild, inaccessibleTickets));
  return { inaccessibleCount: inaccessibleTickets.length, notified };
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
 * 停止中に消されたチャンネルのチケットを片付けてから、自動削除タイマーを復元する。
 * Bot が扱えないチケットのチャンネルはログにだけ残す（起動のたびに通知すると騒がしいため）
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function syncTicketsOnStartup(
  client: Client,
  ticketRepository: ITicketRepository,
): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await reconcileTicketChannels(guild, ticketRepository);
  }
  await restoreAutoDeleteTimers(client, ticketRepository);
}
