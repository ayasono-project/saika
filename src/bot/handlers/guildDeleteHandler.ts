// src/bot/handlers/guildDeleteHandler.ts
// guildDelete 時の全設定クリーンアップハンドラ

import type { Guild } from "discord.js";
import { logPrefixed } from "../../shared/locale/localeManager";
import { jobScheduler } from "../../shared/scheduler/jobScheduler";
import { logger } from "../../shared/utils/logger";
import { TICKET_AUTO_DELETE_JOB_PREFIX } from "../features/ticket/commands/ticketCommand.constants";
import {
  getBotGuildConfigService,
  getBotTicketRepository,
} from "../services/botCompositionRoot";

/**
 * Bot がギルドから退出した際に、そのギルドの全設定データを削除する
 * @param guild 退出したギルド
 */
export async function handleGuildDelete(guild: Guild): Promise<void> {
  const guildId = guild.id;

  logger.info(
    logPrefixed("system:log_prefix.guild_delete", "system:guild_delete.start", {
      guildId,
      guildName: guild.name,
    }),
  );

  try {
    // チケット自動削除タイマーをすべてキャンセル
    const ticketRepository = getBotTicketRepository();
    const closedTickets = await ticketRepository
      .findAllClosedByGuild(guildId)
      .catch(() => []);
    for (const ticket of closedTickets) {
      const jobId = `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticket.id}`;
      if (jobScheduler.hasJob(jobId)) {
        jobScheduler.removeJob(jobId);
      }
    }

    // 全設定データを一括削除（GuildConfig + 各機能テーブル）
    const guildConfigService = getBotGuildConfigService();
    await guildConfigService.deleteAllConfig(guildId);

    logger.info(
      logPrefixed(
        "system:log_prefix.guild_delete",
        "system:guild_delete.complete",
        { guildId },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.guild_delete",
        "system:guild_delete.failed",
        { guildId },
      ),
      err,
    );
  }
}
