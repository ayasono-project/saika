// src/features/guild-settings/usecases/purgeGuildDataUsecase.ts
// ギルドの全データ後始末（インメモリタイマー解除 + DB 一括削除）のユースケース

import type { ITicketRepository } from "../../../shared/database/types/repositories";
import { jobScheduler } from "../../../shared/scheduler/jobScheduler";
import type { BumpReminderManager } from "../../bump-reminder/services/bumpReminderService";
import { TICKET_AUTO_DELETE_JOB_PREFIX } from "../../ticket/commands/ticketCommand.constants";
import type { GuildSettingsService } from "../guildSettingsService";

type PurgeGuildDataDeps = {
  guildSettingsService: GuildSettingsService;
  ticketRepository: ITicketRepository;
  bumpReminderManager: BumpReminderManager;
};

/**
 * ギルドの全データを後始末する（reset-all / guildDelete 共通）
 *
 * DB 行を消すだけではインメモリタイマーは止まらない。
 * `createTrackedReminderTask` は投稿を実行した「後に」status を更新するため、
 * 先に DB を消すとタイマーが生き残って投稿が実行され、
 * 続く status 更新が P2025 で失敗してログが荒れる。
 * したがって「タイマー解除 → DB 削除」の順序を必ず守ること。
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function purgeGuildDataUsecase(
  deps: PurgeGuildDataDeps,
  guildId: string,
): Promise<void> {
  const { guildSettingsService, ticketRepository, bumpReminderManager } = deps;

  // 1. チケット自動削除タイマーをすべてキャンセル
  const closedTickets = await ticketRepository
    .findAllClosedByGuild(guildId)
    .catch(() => []);
  for (const ticket of closedTickets) {
    const jobId = `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticket.id}`;
    if (jobScheduler.hasJob(jobId)) {
      jobScheduler.removeJob(jobId);
    }
  }

  // 2. Bump リマインダーのインメモリタイマーをキャンセル（サービス別の複合キーを含む）
  await bumpReminderManager.cancelAllForGuild(guildId);

  // 3. 全設定データを一括削除（GuildSettings + 各機能テーブル）
  await guildSettingsService.deleteAllSettings(guildId);
}
