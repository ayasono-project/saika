// src/features/inactive-kick/handlers/recordActivity.ts
// 非アクティブ自動キックのアクティビティ記録（共通処理）

import type { Guild, GuildMember } from "discord.js";
import {
  getBotInactiveKickSettingsService,
  getBotMemberActivityRepository,
} from "../../../bot/services/botCompositionRoot";
import type { ActivityTrigger } from "../../../shared/database/types";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TtlMap } from "../../../shared/utils/ttlMap";
import {
  computeTenureDays,
  resolveApplicableTier,
} from "../services/inactiveKickEligibility";

export type { ActivityTrigger };

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
 * トリガー種別に対応する在籍階層の `trackX` フラグを返す。
 * @param tier 適用中の在籍階層
 * @param trigger アクティビティ種別
 */
function isTrackedByTier(
  tier: { trackMessage: boolean; trackVoice: boolean; trackReaction: boolean },
  trigger: ActivityTrigger,
): boolean {
  if (trigger === "message") return tier.trackMessage;
  if (trigger === "voice") return tier.trackVoice;
  return tier.trackReaction;
}

/**
 * メンバーの活動を記録する（throttle 付き）。
 *
 * - 直近 1 時間以内に書き込み済みなら何もしない（throttle）
 * - 設定が存在する場合、メンバーの**現在の在籍日数から該当する在籍階層を解決**し、
 *   その階層でこのトリガー種別が無効化されていたらスキップする（該当階層が無ければ記録しない）
 * - `lastActivityAt` を現在時刻へ更新し、該当トリガーの累積カウントを +1、`warnStage` を 0 にリセットする
 * - 付与済みの対象ロールがあれば剥奪する（ロール未付与なら何もしない）
 *
 * @param guild 対象ギルド
 * @param userId 対象ユーザーID
 * @param trigger このアクティビティを発生させたイベント種別
 * @param resolveJoinedAt 対象メンバーの参加日時を遅延解決する関数（在籍階層の解決に必要）
 * @param resolveMember 対象ロール剥奪に必要なメンバーを遅延解決する関数
 */
export async function recordMemberActivity(
  guild: Guild,
  userId: string,
  trigger: ActivityTrigger,
  resolveJoinedAt: () => Promise<Date | null>,
  resolveMember: () => Promise<GuildMember | null>,
): Promise<void> {
  const key = cacheKey(guild.id, userId);
  // throttle: 直近 1 時間以内に書き込み済みならスキップ
  if (lastWriteCache.has(key)) return;

  const now = new Date();
  const settings = await getBotInactiveKickSettingsService().getSettings(
    guild.id,
  );
  if (settings) {
    // 設定がある場合のみ、現在の在籍階層を解決してトリガー可否を判定する
    // （未設定・機能未構成の間は現行通り常に記録し、有効化後すぐ活動履歴を活かせるようにする）
    const joinedAt = await resolveJoinedAt();
    const tenureDays = computeTenureDays(joinedAt, now);
    const tier = resolveApplicableTier(tenureDays, settings.tiers);
    // 該当階層が無い（対象外）場合は記録しない（キック判定の対象外と一貫させる）
    if (!tier || !isTrackedByTier(tier, trigger)) return;
  }

  lastWriteCache.set(key, true);

  const activityRepo = getBotMemberActivityRepository();
  try {
    const existing = await activityRepo.getActivity(guild.id, userId);
    const hadWarning = (existing?.warnStage ?? 0) > 0;
    await activityRepo.recordActivity(
      guild.id,
      userId,
      now,
      trigger,
      hadWarning ? 0 : undefined,
    );
    if (hadWarning) {
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
