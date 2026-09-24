// guildCreate 時のBot共通ハンドラ

import type { Guild } from "discord.js";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { getBotGuildRegistryRepository } from "../services/botCompositionRoot";
import { applyBotPresence } from "../services/botPresence";

/**
 * Bot がギルドへ参加した際の共通処理を行う
 * @param guild 参加したギルド
 * @returns 実行完了を示す Promise
 */
export async function handleGuildCreate(guild: Guild): Promise<void> {
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

  // 全機能テーブルが guilds へ FK を張っているため、親行が無いギルドでは
  // 設定を1件も保存できない。プレゼンス更新（Discord API 呼び出し）より先に
  // 作り、FK 違反になりうる時間を最短にする。
  // ensureGuild は純粋な委譲なのでサービス層を挟まない（実装ガイドラインの例外）
  try {
    await getBotGuildRegistryRepository().ensureGuild(guild.id);
  } catch (error) {
    // ここで throw すると以降のプレゼンス更新まで巻き添えで止まる。
    // 取りこぼしは次回起動時のスイープが拾うため、記録だけして続行する
    logger.error(
      logPrefixed(
        "system:log_prefix.guild_create",
        "system:guild_create.registry_failed",
        { guildId: guild.id },
      ),
      error,
    );
  }

  // 稼働サーバー数の表示を更新する
  applyBotPresence(guild.client);
}
