// src/bot/features/ticket/handlers/ticketChannelDeleteHandler.ts
// パネル設置チャンネル削除検知ハンドラ

import type { Channel } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotTicketConfigService } from "../../../services/botCompositionRoot";

/**
 * channelDelete 時にパネル設置チャンネルの削除を検知し、設定をクリーンアップする
 * 既存チケットチャンネル・チケットレコードは維持する
 * @param channel 削除されたチャンネル
 */
export async function handleTicketChannelDelete(
  channel: Channel,
): Promise<void> {
  if (!("guildId" in channel) || !channel.guildId) return;

  const guildId = channel.guildId;
  const configService = getBotTicketConfigService();

  try {
    const configs = await configService.findAllByGuild(guildId);

    const matchedConfigs = configs.filter(
      (config) => config.panelChannelId === channel.id,
    );
    if (matchedConfigs.length === 0) return;

    for (const config of matchedConfigs) {
      await configService.delete(config.guildId, config.categoryId);

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
