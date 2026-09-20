// src/bot/handlers/guildCreateHandler.ts
// guildCreate 時のBot共通ハンドラ

import type { Guild } from "discord.js";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { applyBotPresence } from "../services/botPresence";

/**
 * Bot がギルドへ参加した際の共通処理を行う
 * @param guild 参加したギルド
 */
export function handleGuildCreate(guild: Guild): void {
  logger.info(
    logPrefixed(
      "system:log_prefix.guild_create",
      "system:guild_create.joined",
      {
        guildId: guild.id,
        guildName: guild.name,
      },
    ),
  );

  // 稼働サーバー数の表示を更新する
  applyBotPresence(guild.client);
}
