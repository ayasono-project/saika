// チケットの自動削除までの残り時間の計算（クローズ時の予約と、起動・再導入・パネル再設置時の組み直しで共通）

import { TICKET_MS_PER_DAY } from "../commands/ticketCommand.constants";

/**
 * 自動削除までの残り時間を求める
 * 自動削除の日数から、これまでクローズしていた時間の累計と、今回クローズしてからの経過時間を引く
 * @param autoDeleteDays カテゴリの自動削除日数
 * @param elapsedDeleteMs これまでクローズしていた時間の累計（再オープンのたびに加算される）
 * @param closedAt 今回クローズした日時（これからクローズする場合は null）
 * @param now 基準時刻（エポックミリ秒）
 * @returns 残り時間（ミリ秒）。0以下なら期限を過ぎている
 */
export function computeAutoDeleteRemainingMs(
  autoDeleteDays: number,
  elapsedDeleteMs: number,
  closedAt: Date | null,
  now: number,
): number {
  const sinceClosedMs = closedAt ? now - closedAt.getTime() : 0;
  return autoDeleteDays * TICKET_MS_PER_DAY - elapsedDeleteMs - sinceClosedMs;
}
