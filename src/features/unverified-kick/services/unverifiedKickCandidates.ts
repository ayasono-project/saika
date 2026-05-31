// src/features/unverified-kick/services/unverifiedKickCandidates.ts
// メンバー集合からキック/事前警告/対象ロール掃除の対象を区分する（純関数・日次チェックと preview で共有）

import {
  classifyStage,
  computeAgeDays,
  computeEffectiveJoinedAt,
  computeRemainingDays,
  type ExclusionInput,
  isExcluded,
  UNVERIFIED_KICK_STAGE,
} from "./unverifiedKickEligibility";

/** 区分判定に必要なメンバー情報（GuildMember から正規化した形） */
export interface CandidateMemberInput {
  userId: string;
  isBot: boolean;
  isOwner: boolean;
  isAdministrator: boolean;
  /** 認証ロールを保持しているか */
  isVerified: boolean;
  memberRoleIds: string[];
  /** サーバー参加日時（取得できなければ null） */
  joinedAt: Date | null;
  /** 対象ロールを付与済みか */
  hasMarkerRole: boolean;
}

/** 区分に必要な設定値 */
export interface CandidateSettings {
  graceDays: number;
  /** 事前警告を送る経過日数（undefined/null なら警告無効） */
  warnDays?: number | null;
  enabledAt?: Date | null;
  exemptRoleIds: string[];
}

/** 区分されたメンバー 1 件 */
export interface CategorizedCandidate {
  userId: string;
  ageDays: number;
  remainingDays: number;
  /** 対象ロールを既に付与済みか */
  hasMarkerRole: boolean;
}

/** 区分結果 */
export interface CandidateBuckets {
  /** 事前警告対象（ageDays == warnDays） */
  warn: CategorizedCandidate[];
  /** キック対象（ageDays >= graceDays） */
  kick: CategorizedCandidate[];
  /** 除外対象だが対象ロールを保持しているメンバー（保険クリーンアップで剥奪） */
  markerCleanup: string[];
}

/**
 * メンバー集合を事前警告・キック・対象ロール掃除の区分へ分類する。
 *
 * - 除外メンバー（Bot/Admin/オーナー/認証済み/除外ロール）はキック・警告の対象外。
 *   ただし対象ロールを保持しているものは `markerCleanup` に積む（貼りっぱなし防止の保険）。
 * - それ以外は実効参加時刻から経過日数を求め、区分を判定する。
 *
 * @param members 正規化済みメンバー一覧
 * @param settings 区分に用いる設定値
 * @param now 現在時刻
 * @returns 区分結果
 */
export function categorizeCandidates(
  members: CandidateMemberInput[],
  settings: CandidateSettings,
  now: Date,
): CandidateBuckets {
  const buckets: CandidateBuckets = {
    warn: [],
    kick: [],
    markerCleanup: [],
  };

  const warnDays = settings.warnDays ?? null;

  for (const member of members) {
    const exclusion: ExclusionInput = {
      isBot: member.isBot,
      isOwner: member.isOwner,
      isAdministrator: member.isAdministrator,
      isVerified: member.isVerified,
      memberRoleIds: member.memberRoleIds,
      exemptRoleIds: settings.exemptRoleIds,
    };

    // 除外メンバー: 対象ロール付与済みなら掃除対象に積む
    if (isExcluded(exclusion)) {
      if (member.hasMarkerRole) {
        buckets.markerCleanup.push(member.userId);
      }
      continue;
    }

    const effective = computeEffectiveJoinedAt(
      member.joinedAt,
      settings.enabledAt ?? null,
    );
    const ageDays = computeAgeDays(effective, now);
    const stage = classifyStage(ageDays, settings.graceDays, warnDays);
    if (stage === UNVERIFIED_KICK_STAGE.NONE) continue;

    const candidate: CategorizedCandidate = {
      userId: member.userId,
      ageDays,
      remainingDays: computeRemainingDays(ageDays, settings.graceDays),
      hasMarkerRole: member.hasMarkerRole,
    };

    if (stage === UNVERIFIED_KICK_STAGE.KICK) buckets.kick.push(candidate);
    else buckets.warn.push(candidate);
  }

  return buckets;
}
