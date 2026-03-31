// src/bot/features/ticket/services/ticketCleanupService.ts
// チケット設定の一括クリーンアップ処理（teardown / reset 共通）

import type { Guild } from "discord.js";
import type {
  GuildTicketConfig,
  ITicketRepository,
  Ticket,
} from "../../../../shared/database/types";
import type { TicketConfigService } from "../../../../shared/features/ticket/ticketConfigService";
import { cancelTicketAutoDelete } from "./ticketAutoDeleteService";
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
 * @param configService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 */
export async function cleanupTicketConfigs(
  guild: Guild,
  configs: GuildTicketConfig[],
  configService: TicketConfigService,
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
      await deleteTicket(ticket, guild, ticketRepository);
    }
  }

  // DB からチケットレコードと設定を先に削除
  // （パネルメッセージ削除で messageDelete イベントが発火しても config が既にないため空振りする）
  for (const config of configs) {
    await ticketRepository
      .deleteByCategory(guildId, config.categoryId)
      .catch(() => null);
    await configService.delete(guildId, config.categoryId).catch(() => null);
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
