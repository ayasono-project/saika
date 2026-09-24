// ギルドに紐づくインメモリタイマーの停止ユースケース（データは削除しない）

import type { ITicketRepository } from "../../../shared/database/types/repositories";
import { jobScheduler } from "../../../shared/scheduler/jobScheduler";
import type { BumpReminderManager } from "../../bump-reminder/services/bumpReminderService";
import { TICKET_AUTO_DELETE_JOB_PREFIX } from "../../ticket/commands/ticketCommand.constants";

type StopGuildJobsDeps = {
  ticketRepository: ITicketRepository;
  bumpReminderManager: BumpReminderManager;
};

/**
 * ギルドに紐づくインメモリタイマーをすべて停止する（データは削除しない）
 *
 * Bump リマインダーだけは DB の status も `cancelled` に更新する（`cancelAllForGuild`）。
 * そのため猶予内に再導入されても、退出時点で予約中だったリマインダーは戻らない。
 *
 * Bot が退出したギルドのジョブが生きていると、もう参加していないギルドに対して
 * 投稿や削除を試み続けてエラーログを吐く。そのため**データの削除を遅らせる場合でも、
 * ジョブの停止だけは退出時に即座に行う**必要がある。
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function stopGuildJobsUsecase(
  deps: StopGuildJobsDeps,
  guildId: string,
): Promise<void> {
  const { ticketRepository, bumpReminderManager } = deps;

  // チケット自動削除タイマーをすべてキャンセル
  const closedTickets = await ticketRepository
    .findAllClosedByGuild(guildId)
    .catch(() => []);
  for (const ticket of closedTickets) {
    const jobId = `${TICKET_AUTO_DELETE_JOB_PREFIX}${ticket.id}`;
    if (jobScheduler.hasJob(jobId)) {
      jobScheduler.removeJob(jobId);
    }
  }

  // Bump リマインダーのインメモリタイマーをキャンセル（サービス別の複合キーを含む）
  await bumpReminderManager.cancelAllForGuild(guildId);
}
