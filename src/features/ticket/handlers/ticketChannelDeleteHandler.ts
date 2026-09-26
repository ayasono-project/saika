// チケットのチャンネル削除検知ハンドラ（チケットチャンネル・パネル設置チャンネル）

import type { Channel } from "discord.js";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { cancelTicketAutoDelete } from "../services/ticketAutoDeleteService";

/**
 * channelDelete 時にチケット関連のチャンネル削除を検知して後始末する
 * - チケットチャンネル: そのチケットの記録と自動削除タイマーを消す
 * - パネル設置チャンネル: 設定を消す（既存のチケットチャンネル・チケットレコードは維持する。
 *   そのカテゴリのチケットは、同じカテゴリにパネルを作り直すまで Bot から操作できず、自動削除も止まる）
 * @param channel 削除されたチャンネル
 */
export async function handleTicketChannelDelete(
  channel: Channel,
): Promise<void> {
  if (!("guildId" in channel) || !channel.guildId) return;

  const guildId = channel.guildId;
  await cleanupDeletedTicketChannel(guildId, channel.id);

  const settingsService = getBotTicketSettingsService();

  try {
    const configs = await settingsService.findAllByGuild(guildId);

    const matchedSettings = configs.filter(
      (config) => config.panelChannelId === channel.id,
    );
    if (matchedSettings.length === 0) return;

    for (const config of matchedSettings) {
      await settingsService.delete(config.guildId, config.categoryId);

      logger.info(
        logPrefixed(
          "system:log_prefix.ticket",
          "ticket:log.panel_channel_deleted",
          {
            guildId: config.guildId,
            categoryId: config.categoryId,
          },
        ),
      );
    }
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.panel_cleanup_failed",
        { guildId },
      ),
      err,
    );
  }
}

/**
 * 消されたチャンネルがチケットのチャンネルなら、その記録と自動削除タイマーを消す
 * Discord の画面から直接消されたとき、記録が残るとオープン中のチケットとして数えられ、
 * 作成者が同時作成の上限に達したまま新しいチケットを作れなくなるため。
 * Bot 自身が消すとき（/ticket delete・自動削除・撤去）は先に記録を消しているので、ここでは見つからない
 * @param guildId 対象ギルドID
 * @param channelId 削除されたチャンネルID
 * @returns 実行完了を示す Promise
 */
async function cleanupDeletedTicketChannel(
  guildId: string,
  channelId: string,
): Promise<void> {
  try {
    const ticketRepository = getBotTicketRepository();
    const ticket = await ticketRepository.findByChannelId(channelId);
    if (!ticket) return;

    cancelTicketAutoDelete(ticket.id, guildId);
    await ticketRepository.delete(ticket.id);
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_channel_deleted",
        { guildId, channelId },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_channel_cleanup_failed",
        { guildId, channelId },
      ),
      err,
    );
  }
}
