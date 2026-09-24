// 退出したギルドのデータ削除を猶予付きで予約するユースケース

import { addDays } from "date-fns";
import type { IGuildRegistryRepository } from "../../../shared/database/types";
import { GUILD_DELETION_GRACE_DAYS } from "../constants/guildSettings.constants";

type ScheduleGuildDeletionDeps = {
  guildRegistryRepository: IGuildRegistryRepository;
};

/**
 * 猶予日数を加えた削除予定時刻を算出する
 * @param now 起点となる現在時刻
 * @returns 削除予定時刻
 */
export function resolveGuildDeletionDeadline(now: Date): Date {
  return addDays(now, GUILD_DELETION_GRACE_DAYS);
}

/**
 * 退出したギルドのデータ削除を予約する
 *
 * ここでは予約を書くだけで、データは一切消さない。実際の削除は猶予切れを拾う
 * 照合（起動時・日次）が行う。再導入されれば予約は取り消される。
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @param now 猶予の起点となる現在時刻
 * @returns 書き込んだ削除予定時刻
 */
export async function scheduleGuildDeletionUsecase(
  deps: ScheduleGuildDeletionDeps,
  guildId: string,
  now: Date,
): Promise<Date> {
  const deleteAt = resolveGuildDeletionDeadline(now);
  await deps.guildRegistryRepository.scheduleDeletion(guildId, deleteAt);
  return deleteAt;
}
