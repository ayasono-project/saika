// 猶予切れギルドのデータを削除するユースケース（照合 reconcileGuildsUsecase の最終段）

import type {
  IGuildRegistryRepository,
  ITicketRepository,
} from "../../../shared/database/types";
import type { BumpReminderManager } from "../../bump-reminder/services/bumpReminderService";
import { stopGuildJobsUsecase } from "./stopGuildJobsUsecase";

type PurgeExpiredGuildsDeps = {
  guildRegistryRepository: IGuildRegistryRepository;
  ticketRepository: ITicketRepository;
  bumpReminderManager: BumpReminderManager;
};

/**
 * 猶予が切れたギルドのデータを削除する
 *
 * 削除は**親行を消すだけ**で、FK の onDelete: Cascade が全機能テーブルを落とす。
 *
 * 退出時にジョブは停止済みだが、猶予中に Bot を再起動すると
 * `restoreBumpRemindersOnStartup` が pending レコードからタイマーを組み直すため、
 * 削除直前にもう一度停止する。`purgeGuildDataUsecase` と同じく
 * 「タイマー解除 → DB 削除」の順序を守ること（先に DB を消すと、生き残った
 * タイマーが投稿を実行して status 更新が P2025 で失敗する）。
 * @param deps 依存オブジェクト
 * @param now 期限判定に使う現在時刻
 * @returns 削除したギルド数
 */
export async function purgeExpiredGuildsUsecase(
  deps: PurgeExpiredGuildsDeps,
  now: Date,
): Promise<number> {
  const { guildRegistryRepository, ticketRepository, bumpReminderManager } =
    deps;

  const expiredGuildIds =
    await guildRegistryRepository.findGuildsDueForDeletion(now);
  if (expiredGuildIds.length === 0) return 0;

  // 1. インメモリタイマーを先に解除する（順序の理由は上記 JSDoc）
  for (const guildId of expiredGuildIds) {
    await stopGuildJobsUsecase(
      { ticketRepository, bumpReminderManager },
      guildId,
    );
  }

  // 2. 親行を削除する。カスケードで全機能テーブルの行が落ちる
  return guildRegistryRepository.deleteGuildsDueForDeletion(
    expiredGuildIds,
    now,
  );
}
