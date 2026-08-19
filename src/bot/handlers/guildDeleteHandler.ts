// src/bot/handlers/guildDeleteHandler.ts
// guildDelete 時の全設定クリーンアップハンドラ

import type { Guild } from "discord.js";
import { purgeGuildDataUsecase } from "../../features/guild-settings/usecases/purgeGuildDataUsecase";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import {
  getBotBumpReminderManager,
  getBotGuildSettingsService,
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
    // インメモリタイマーを解除してから全設定データを一括削除する
    await purgeGuildDataUsecase(
      {
        guildSettingsService: getBotGuildSettingsService(),
        ticketRepository: getBotTicketRepository(),
        bumpReminderManager: getBotBumpReminderManager(),
      },
      guildId,
    );

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
