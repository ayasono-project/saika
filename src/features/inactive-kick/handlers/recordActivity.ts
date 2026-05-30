// src/features/inactive-kick/handlers/recordActivity.ts
// 非アクティブ自動キックのアクティビティ記録（共通処理）

import type { Guild, GuildMember } from "discord.js";
import {
  getBotInactiveKickSettingsService,
  getBotMemberActivityRepository,
} from "../../../bot/services/botCompositionRoot";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TtlMap } from "../../../shared/utils/ttlMap";

/** 同一メンバーの書き込みを抑制する throttle 間隔（1 時間） */
const ACTIVITY_THROTTLE_MS = 60 * 60 * 1000;

/**
 * 最終書き込み時刻のインメモリキャッシュ。
 * キーが存在する = 直近 1 時間以内に書き込み済み。TTL でエントリは自動失効する。
 * 判定の読み取り（DB）コストを避けるために併用する。
 */
const lastWriteCache = new TtlMap<true>(ACTIVITY_THROTTLE_MS);

/** throttle 判定用のキャッシュキーを生成する */
function cacheKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

/**
 * 警告済みメンバーが再活動した際に、付与済みの対象ロールを剥奪する。
 * 対象ロール未設定・未付与・メンバー解決不可の場合は何もしない（ホットパスでの不要な API 呼び出しを避ける）。
 * @param guild 対象ギルド
 * @param userId 対象ユーザーID
 * @param resolveMember メンバーを遅延解決する関数（必要時のみ呼ぶ）
 */
async function clearMarkerRoleIfPresent(
  guild: Guild,
  userId: string,
  resolveMember: () => Promise<GuildMember | null>,
): Promise<void> {
  const settings = await getBotInactiveKickSettingsService().getSettings(
    guild.id,
  );
  const markerRoleId = settings?.markerRoleId;
  if (!markerRoleId) return;

  const member = await resolveMember();
  if (!member || !member.roles.cache.has(markerRoleId)) return;

  try {
    const t = await getGuildTranslator(guild.id);
    await member.roles.remove(
      markerRoleId,
      t("inactiveKick:audit_reason.reactivated"),
    );
  } catch (err) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.inactive_kick",
        "inactiveKick:log.marker_role_remove_failed",
        { guildId: guild.id, userId },
      ),
      err,
    );
  }
}

/**
 * メンバーの活動を記録する（throttle 付き）。
 *
 * - 直近 1 時間以内に書き込み済みなら何もしない（throttle）
 * - `lastActivityAt` を現在時刻へ更新する
 * - 警告済み（`warnStage > 0`）だった場合は `warnStage` を 0 にリセットし、対象ロールを剥奪する
 *   （警告済みメンバーは定義上 1 時間以内の活動が無いため、復帰の初回活動は必ず throttle されずリセットが走る）
 *
 * @param guild 対象ギルド
 * @param userId 対象ユーザーID
 * @param resolveMember 対象ロール剥奪に必要なメンバーを遅延解決する関数
 */
export async function recordMemberActivity(
  guild: Guild,
  userId: string,
  resolveMember: () => Promise<GuildMember | null>,
): Promise<void> {
  const key = cacheKey(guild.id, userId);
  // throttle: 直近 1 時間以内に書き込み済みならスキップ
  if (lastWriteCache.has(key)) return;
  lastWriteCache.set(key, true);

  const activityRepo = getBotMemberActivityRepository();
  try {
    // warnStage の前進状態は剥奪要否の判定にも使うため、書き込み前に取得する
    const existing = await activityRepo.getActivity(guild.id, userId);
    const wasWarned = (existing?.warnStage ?? 0) > 0;

    // 警告済みだった場合のみ warnStage を 0 へリセット（それ以外は lastActivityAt のみ更新）
    await activityRepo.recordActivity(
      guild.id,
      userId,
      new Date(),
      wasWarned ? 0 : undefined,
    );

    // 警告済みだった場合は付与済みの対象ロールを剥奪する
    if (wasWarned) {
      await clearMarkerRoleIfPresent(guild, userId, resolveMember);
    }
  } catch (err) {
    // 書き込みに失敗したら throttle キャッシュを戻し、次回の活動で再試行できるようにする
    lastWriteCache.delete(key);
    logger.error(
      logPrefixed(
        "system:log_prefix.inactive_kick",
        "inactiveKick:log.activity_record_failed",
        { guildId: guild.id, userId },
      ),
      err,
    );
  }
}

/**
 * throttle キャッシュをクリアする（主にテスト用）。
 */
export function clearActivityThrottleCache(): void {
  lastWriteCache.clear();
}
