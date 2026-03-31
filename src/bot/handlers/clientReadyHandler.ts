// src/bot/handlers/clientReadyHandler.ts
// clientReady 時のBot共通ハンドラー

import { ActivityType, PresenceUpdateStatus } from "discord.js";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import type { BotClient } from "../client";
import { restoreBumpRemindersOnStartup } from "../features/bump-reminder/handlers/bumpReminderStartup";
import { initGuildInviteCache } from "../features/member-log/handlers/inviteTracker";
import { restoreAutoDeleteTimers } from "../features/ticket/services/ticketAutoDeleteService";
import { cleanupVacOnStartup } from "../features/vac/handlers/vacStartupCleanup";
import { getBotTicketRepository } from "../services/botCompositionRoot";

/**
 * clientReady 発火時の初期化後処理をまとめて実行する関数
 */
export async function handleClientReady(client: BotClient): Promise<void> {
  try {
    // 起動直後の基本メトリクスをログ出力
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.bot_ready", {
        tag: client.user?.username,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.servers", {
        count: client.guilds.cache.size,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.users", {
        count: client.users.cache.size,
      }),
    );
    logger.info(
      logPrefixed("system:log_prefix.ready", "system:ready.commands", {
        count: client.commands.size,
      }),
    );

    // 稼働中サーバー数をプレゼンス文言へ反映
    // プレゼンス文言生成で再利用するため一度だけ取得
    const serverCount = client.guilds.cache.size;
    client.user?.setPresence({
      activities: [
        {
          name: tDefault("system:bot.presence_activity", {
            count: serverCount,
          }),
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
    });

    // 全サーバーの招待リンクをキャッシュ（メンバーログの招待追跡に使用）
    await Promise.all(
      client.guilds.cache.map((guild) => initGuildInviteCache(guild)),
    );

    // 起動時復元・クリーンアップを順に実行
    await restoreBumpRemindersOnStartup(client);
    // Bump 復元後に VAC 掃除を行い、起動後の状態を最終整合
    await cleanupVacOnStartup(client);
    // クローズ済みチケットの自動削除タイマーを復元
    await restoreAutoDeleteTimers(client, getBotTicketRepository());
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ready",
        "system:ready.startup_init_failed",
      ),
      error,
    );
  }
}
