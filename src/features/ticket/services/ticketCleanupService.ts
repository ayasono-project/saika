// チケット設定の一括クリーンアップ処理（teardown / reset 共通）

import type { Guild } from "discord.js";
import type {
  GuildTicketSettings,
  ITicketRepository,
  Ticket,
} from "../../../shared/database/types";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TICKET_CHANNEL_BOT_DELETE_PERMISSIONS } from "../commands/ticketCommand.constants";
import type { TicketSettingsService } from "../ticketSettingsService";
import { cancelTicketAutoDelete } from "./ticketAutoDeleteService";
import { getTicketChannelAccess } from "./ticketChannelAccess";
import { deleteTicket } from "./ticketService";

/**
 * 指定されたカテゴリ群のチケットと設定を一括クリーンアップする
 * teardown（単一カテゴリ）/ reset（全カテゴリ）で共通使用
 *
 * 処理順序:
 * 1. チケットの自動削除タイマーをキャンセル + チャンネル削除
 * 2. DB からチケットレコードと設定を削除
 * 3. パネルメッセージを削除
 * @param guild 対象ギルド
 * @param configs クリーンアップ対象のチケット設定一覧
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @returns 実行完了を示す Promise
 */
export async function cleanupTicketSettings(
  guild: Guild,
  configs: GuildTicketSettings[],
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<void> {
  const guildId = guild.id;

  // 各カテゴリのタイマーキャンセルとチャンネル削除
  for (const config of configs) {
    const closedTickets = await ticketRepository
      .findAllClosedByGuild(guildId)
      .then((tickets: Ticket[]) =>
        tickets.filter((t) => t.categoryId === config.categoryId),
      )
      .catch(() => [] as Ticket[]);
    for (const ticket of closedTickets) {
      cancelTicketAutoDelete(ticket.id, guildId);
    }

    const openTickets = await ticketRepository
      .findOpenByCategory(guildId, config.categoryId)
      .catch(() => [] as Ticket[]);
    for (const ticket of [...openTickets, ...closedTickets]) {
      // Bot が扱えないチャンネル（Bot を外して入れ直した後の古いチケット等）や、「チャンネルの管理」が無い
      // チャンネルは消せない。deleteTicket はどちらでも止まるので、撤去全体を止めないよう飛ばして warn を残す
      // （記録は後の deleteByCategory で消え、チャンネルは管理者が消す）
      const access = await getTicketChannelAccess(
        guild,
        ticket.channelId,
        TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
      );
      if (access.status === "inaccessible") {
        cancelTicketAutoDelete(ticket.id, guildId);
        logger.warn(
          logPrefixed(
            "system:log_prefix.ticket",
            "ticket:log.teardown_channel_inaccessible",
            { guildId, channelId: ticket.channelId },
          ),
        );
        continue;
      }
      await deleteTicket(ticket, guild, ticketRepository);
    }
  }

  // DB からチケットレコードと設定を先に削除
  // （パネルメッセージ削除で messageDelete イベントが発火しても config が既にないため空振りする）
  for (const config of configs) {
    await ticketRepository
      .deleteByCategory(guildId, config.categoryId)
      .catch(() => null);
    await settingsService.delete(guildId, config.categoryId).catch(() => null);
  }

  // パネルメッセージを削除
  for (const config of configs) {
    try {
      const panelChannel = await guild.channels
        .fetch(config.panelChannelId)
        .catch(() => null);
      if (panelChannel && "messages" in panelChannel) {
        const panelMessage = await panelChannel.messages
          .fetch(config.panelMessageId)
          .catch(() => null);
        if (panelMessage) {
          await panelMessage.delete().catch(() => null);
        }
      }
    } catch {
      // パネルメッセージが見つからない場合は無視
    }
  }
}
