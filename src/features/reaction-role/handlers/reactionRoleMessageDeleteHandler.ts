// src/bot/features/reaction-role/handlers/reactionRoleMessageDeleteHandler.ts
// パネルメッセージ削除検知ハンドラ

import type { Message, PartialMessage } from "discord.js";
import { getBotReactionRolePanelSettingsService } from "../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * messageDelete 時にパネルメッセージの削除を検知し、DBレコードをクリーンアップする
 * @param message 削除されたメッセージ
 */
export async function handleReactionRoleMessageDelete(
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guildId) return;

  const settingsService = getBotReactionRolePanelSettingsService();

  try {
    const panels = await settingsService.findAllByGuild(message.guildId);

    const matchedPanel = panels.find((panel) => panel.messageId === message.id);
    if (!matchedPanel) return;

    await settingsService.delete(matchedPanel.id, matchedPanel.guildId);

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.panel_message_deleted",
        {
          guildId: matchedPanel.guildId,
          panelId: matchedPanel.id,
        },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.panel_cleanup_failed",
        { guildId: message.guildId },
      ),
      err,
    );
  }
}
