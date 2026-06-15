// src/bot/features/reaction-role/handlers/reactionRoleChannelDeleteHandler.ts
// パネル設置チャンネル削除検知ハンドラ

import type { Channel } from "discord.js";
import { getBotReactionRolePanelSettingsService } from "../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * channelDelete 時にパネル設置チャンネルの削除を検知し、DBレコードをクリーンアップする
 * @param channel 削除されたチャンネル
 */
export async function handleReactionRoleChannelDelete(
  channel: Channel,
): Promise<void> {
  if (!("guildId" in channel) || !channel.guildId) return;

  const guildId = channel.guildId;
  const settingsService = getBotReactionRolePanelSettingsService();

  try {
    const panels = await settingsService.findAllByGuild(guildId);

    const matchedPanels = panels.filter(
      (panel) => panel.channelId === channel.id,
    );
    if (matchedPanels.length === 0) return;

    for (const panel of matchedPanels) {
      await settingsService.delete(panel.id, guildId);
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.panel_channel_deleted",
        {
          guildId,
          channelId: channel.id,
        },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.panel_cleanup_failed",
        { guildId },
      ),
      err,
    );
  }
}
