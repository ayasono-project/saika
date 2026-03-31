// src/bot/features/ticket/services/ticketAutoDeleteService.ts
// チケット自動削除サービス

import type { Client } from "discord.js";
import type { ITicketRepository } from "../../../../shared/database/types";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { jobScheduler } from "../../../../shared/scheduler/jobScheduler";
import { logger } from "../../../../shared/utils/logger";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../services/botCompositionRoot";
import { TICKET_AUTO_DELETE_JOB_PREFIX } from "../commands/ticketCommand.constants";

/**
 * 自動削除タイマーを開始する
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param delayMs 削除までの遅延ミリ秒
 * @param client Discord クライアント
 */
export function scheduleTicketAutoDelete(
  ticketId: string,
  channelId: string,
  guildId: string,
  delayMs: number,
  client: Client,
): void {
  const jobId = `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticketId}`;

  logger.info(
    logPrefixed(
      "system:log_prefix.ticket",
      "ticket:log.auto_delete_scheduled",
      {
        guildId,
        channelId,
        delayMs: String(delayMs),
      },
    ),
  );

  jobScheduler.addOneTimeJob(jobId, delayMs, async () => {
    await executeAutoDelete(ticketId, channelId, guildId, client);
  });
}

/**
 * 自動削除タイマーをキャンセルする
 * @param ticketId チケットID
 * @param guildId ギルドID
 */
export function cancelTicketAutoDelete(
  ticketId: string,
  guildId: string,
): void {
  const jobId = `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticketId}`;
  if (jobScheduler.hasJob(jobId)) {
    jobScheduler.removeJob(jobId);
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_cancelled",
        { guildId, ticketId },
      ),
    );
  }
}

/**
 * 自動削除を実行する
 * @param ticketId チケットID
 * @param channelId チケットチャンネルID
 * @param guildId ギルドID
 * @param client Discord クライアント
 */
async function executeAutoDelete(
  ticketId: string,
  channelId: string,
  guildId: string,
  client: Client,
): Promise<void> {
  try {
    const ticketRepository = getBotTicketRepository();

    // DB からチケットを削除
    await ticketRepository.delete(ticketId);

    // チャンネルを削除
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (guild) {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel.delete().catch(() => null);
      }
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_auto_deleted",
        { guildId, channelId },
      ),
    );
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_auto_deleted",
        { guildId, channelId },
      ),
      error,
    );
  }
}

/**
 * Bot起動時にクローズ済みチケットの自動削除タイマーを復元する
 * @param client Discord クライアント
 * @param ticketRepository チケットリポジトリ
 */
export async function restoreAutoDeleteTimers(
  client: Client,
  ticketRepository: ITicketRepository,
): Promise<void> {
  // 全ギルドのクローズ済みチケットを取得
  // client.guilds.cache から全ギルドIDを取得してクローズ済みチケットを探す
  const guildIds = Array.from(client.guilds.cache.keys());
  let restoredCount = 0;

  for (const guildId of guildIds) {
    const closedTickets = await ticketRepository
      .findAllClosedByGuild(guildId)
      .catch(() => []);

    for (const ticket of closedTickets) {
      const configService = getBotTicketConfigService();
      const config = await configService
        .findByGuildAndCategory(ticket.guildId, ticket.categoryId)
        .catch(() => null);
      if (!config) continue;

      const autoDeleteMs = config.autoDeleteDays * 24 * 60 * 60 * 1000;
      const remainingMs = autoDeleteMs - ticket.elapsedDeleteMs;

      // closedAt からの経過時間も考慮
      let adjustedRemainingMs = remainingMs;
      if (ticket.closedAt) {
        const elapsedSinceClose = Date.now() - ticket.closedAt.getTime();
        adjustedRemainingMs = remainingMs - elapsedSinceClose;
      }

      // 残り時間が0以下の場合は即時削除される（addOneTimeJob内でMath.max(0, delayMs)）
      scheduleTicketAutoDelete(
        ticket.id,
        ticket.channelId,
        ticket.guildId,
        adjustedRemainingMs,
        client,
      );
      restoredCount++;
    }
  }

  if (restoredCount > 0) {
    logger.info(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.auto_delete_restore",
        { count: String(restoredCount) },
      ),
    );
  }
}
