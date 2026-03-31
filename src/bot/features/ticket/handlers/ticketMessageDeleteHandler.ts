// src/bot/features/ticket/handlers/ticketMessageDeleteHandler.ts
// パネルメッセージ削除検知ハンドラ

import type { Message, PartialMessage } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotTicketConfigService } from "../../../services/botCompositionRoot";

/**
 * messageDelete 時にパネルメッセージの削除を検知し、設定をクリーンアップする
 * 既存チケットチャンネル・チケットレコードは維持する
 * @param message 削除されたメッセージ
 */
export async function handleTicketMessageDelete(
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guildId) return;

  const configService = getBotTicketConfigService();

  try {
    const configs = await configService.findAllByGuild(message.guildId);

    const matchedConfig = configs.find(
      (config) => config.panelMessageId === message.id,
    );
    if (!matchedConfig) return;

    await configService.delete(matchedConfig.guildId, matchedConfig.categoryId);

    logger.info(
      logPrefixed("system:log_prefix.ticket", "ticket:log.panel_deleted", {
        guildId: matchedConfig.guildId,
        categoryId: matchedConfig.categoryId,
      }),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.panel_cleanup_failed",
        { guildId: message.guildId },
      ),
      err,
    );
  }
}
