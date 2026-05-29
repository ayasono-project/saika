// src/bot/features/ticket/handlers/ticketMessageDeleteHandler.ts
// パネルメッセージ削除検知ハンドラ

import type { Message, PartialMessage } from "discord.js";
import { getBotTicketSettingsService } from "../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * messageDelete 時にパネルメッセージの削除を検知し、設定をクリーンアップする
 * 既存チケットチャンネル・チケットレコードは維持する
 * @param message 削除されたメッセージ
 */
export async function handleTicketMessageDelete(
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guildId) return;

  const settingsService = getBotTicketSettingsService();

  try {
    const configs = await settingsService.findAllByGuild(message.guildId);

    const matchedSettings = configs.find(
      (config) => config.panelMessageId === message.id,
    );
    if (!matchedSettings) return;

    await settingsService.delete(
      matchedSettings.guildId,
      matchedSettings.categoryId,
    );

    logger.info(
      logPrefixed("system:log_prefix.ticket", "ticket:log.panel_deleted", {
        guildId: matchedSettings.guildId,
        categoryId: matchedSettings.categoryId,
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
