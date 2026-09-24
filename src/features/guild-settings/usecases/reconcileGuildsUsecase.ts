// DB のギルド登録を Bot の参加状況と照合するユースケース（起動時 + 日次ジョブ共通）

import type {
  IGuildRegistryRepository,
  ITicketRepository,
} from "../../../shared/database/types";
import type { BumpReminderManager } from "../../bump-reminder/services/bumpReminderService";
import { purgeExpiredGuildsUsecase } from "./purgeExpiredGuildsUsecase";
import { resolveGuildDeletionDeadline } from "./scheduleGuildDeletionUsecase";

type ReconcileGuildsDeps = {
  guildRegistryRepository: IGuildRegistryRepository;
  ticketRepository: ITicketRepository;
  bumpReminderManager: BumpReminderManager;
};

/** 照合で変化した件数 */
export type ReconcileGuildsResult = {
  /** 参加中なのに予約が残っていたため取り消した件数 */
  cancelledCount: number;
  /** 参加していないのに予約が無かったため新たに予約した件数 */
  scheduledCount: number;
  /** 猶予が切れて削除した件数 */
  purgedCount: number;
};

/**
 * DB のギルド登録を Bot の参加状況と照合し、削除予約を正しい状態へ揃える
 *
 * 予約を `guildCreate` / `guildDelete` のイベントだけで管理すると、Bot の停止中や
 * 切断中に起きた参加・退出を取りこぼし、**参加中のギルドのデータを消す／退出した
 * ギルドのデータが永久に残る**のどちらかになる。イベントは即時反映の近道として残し、
 * 正しさはこの照合で担保する。
 *
 * 1. 参加中のギルドの親行を補完する（停止中に追加されたギルドは guildCreate が飛ばない）
 * 2. 参加中のギルドの削除予約を取り消す
 * 3. 参加していないのに予約の無いギルドへ削除を予約する
 * 4. 猶予切れのギルドを削除する
 *
 * **2 は 4 より必ず先に行う**（逆にすると参加中のギルドを期限切れとして消す）。
 * @param deps 依存オブジェクト
 * @param joinedGuildIds いま Bot が参加しているギルドの ID（REST で取得した一覧。キャッシュは
 *   再接続後に消えたギルドが残るので使わない）
 * @param now 期限判定と予約の起点に使う現在時刻
 * @returns 照合で変化した件数
 */
export async function reconcileGuildsUsecase(
  deps: ReconcileGuildsDeps,
  joinedGuildIds: string[],
  now: Date,
): Promise<ReconcileGuildsResult> {
  const { guildRegistryRepository } = deps;

  await guildRegistryRepository.ensureGuilds(joinedGuildIds);
  const cancelledCount =
    await guildRegistryRepository.cancelScheduledDeletions(joinedGuildIds);

  // 参加ギルドが0件なら予約を入れない。0件は設定ミス（ギルドに参加していない別アプリの
  // トークンで本番 DB に繋いだ等）の可能性が高く、全ギルドを一斉に予約してしまうのを
  // 避ける（API の失敗は例外になり、ここまで来ない）。本当に0件でも、退出時の
  // guildDelete で予約は入っている
  const scheduledCount =
    joinedGuildIds.length === 0
      ? 0
      : await guildRegistryRepository.scheduleDeletionForAbsentGuilds(
          joinedGuildIds,
          resolveGuildDeletionDeadline(now),
        );

  const purgedCount = await purgeExpiredGuildsUsecase(deps, now);

  return { cancelledCount, scheduledCount, purgedCount };
}
