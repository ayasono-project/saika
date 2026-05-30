// src/features/inactive-kick/services/inactiveKickCandidates.ts
// メンバー集合からキック/段階通知の対象を区分する（純関数・日次チェックと preview で共有）

import {
  classifyStage,
  computeDaysLeft,
  computeEffectiveLastActivity,
  computeInactiveDays,
  type ExclusionInput,
  INACTIVE_KICK_STAGE,
  isExcluded,
  isMarkerRoleTarget,
} from "./inactiveKickEligibility";

/** 区分判定に必要なメンバー情報（GuildMember から正規化した形） */
export interface CandidateMemberInput {
  userId: string;
  /** 通知・キック前に控える表示名 */
  displayName: string;
  isBot: boolean;
  isOwner: boolean;
  isAdministrator: boolean;
  /** 現在いずれかの VC に接続中か */
  inVoice: boolean;
  memberRoleIds: string[];
  /** サーバー参加日時（取得できなければ null） */
  joinedAt: Date | null;
  /** 対象ロールを付与済みか */
  hasMarkerRole: boolean;
}

/** メンバーの活動履歴（無ければ lastActivityAt=null / warnStage=0） */
export interface CandidateActivity {
  lastActivityAt: Date | null;
  warnStage: number;
}

/** 区分に必要な設定値 */
export interface CandidateSettings {
  thresholdDays: number;
  enabledAt?: Date | null;
  whitelistRoleIds: string[];
  whitelistUserIds: string[];
}

/** 区分されたメンバー 1 件 */
export interface CategorizedCandidate {
  userId: string;
  displayName: string;
  inactiveDays: number;
  daysLeft: number;
  warnStage: number;
  /** 対象ロール付与対象（警告段階に入っている）か */
  isMarkerTarget: boolean;
  /** 対象ロールを既に付与済みか */
  hasMarkerRole: boolean;
}

/** 除外され、かつ猶予クリアが必要なメンバー */
export interface GraceClearTarget {
  userId: string;
  hasMarkerRole: boolean;
}

/** 区分結果 */
export interface CandidateBuckets {
  /** 1 週間前通知対象 */
  weekWarn: CategorizedCandidate[];
  /** 最終警告対象 */
  finalWarn: CategorizedCandidate[];
  /** キック対象 */
  kick: CategorizedCandidate[];
  /** 除外メンバーのうち猶予クリア（warnStage リセット・対象ロール剥奪）が必要なもの */
  graceClear: GraceClearTarget[];
}

/**
 * メンバー集合を段階通知・キックの区分へ分類する。
 *
 * - 除外メンバー（Bot/Admin/オーナー/ホワイトリスト/VC 接続中）はキック・通知の対象外。
 *   ただし `warnStage > 0` または対象ロール付与済みのものは `graceClear` に積む（除外＝猶予リセット）。
 * - それ以外は実効最終活動時刻から非アクティブ日数を求め、警告段階を判定する。
 *
 * @param members 正規化済みメンバー一覧
 * @param activities userId → 活動履歴のマップ
 * @param settings 区分に用いる設定値
 * @param now 現在時刻
 * @returns 区分結果
 */
export function categorizeCandidates(
  members: CandidateMemberInput[],
  activities: Map<string, CandidateActivity>,
  settings: CandidateSettings,
  now: Date,
): CandidateBuckets {
  const buckets: CandidateBuckets = {
    weekWarn: [],
    finalWarn: [],
    kick: [],
    graceClear: [],
  };

  for (const member of members) {
    const exclusion: ExclusionInput = {
      isBot: member.isBot,
      isOwner: member.isOwner,
      isAdministrator: member.isAdministrator,
      inVoice: member.inVoice,
      userId: member.userId,
      memberRoleIds: member.memberRoleIds,
      whitelistRoleIds: settings.whitelistRoleIds,
      whitelistUserIds: settings.whitelistUserIds,
    };

    const activity = activities.get(member.userId);
    const warnStage = activity?.warnStage ?? 0;

    // 除外メンバー: 警告進行 or 対象ロール付与済みなら猶予クリア対象に積む
    if (isExcluded(exclusion)) {
      if (warnStage > 0 || member.hasMarkerRole) {
        buckets.graceClear.push({
          userId: member.userId,
          hasMarkerRole: member.hasMarkerRole,
        });
      }
      continue;
    }

    const effective = computeEffectiveLastActivity(
      activity?.lastActivityAt ?? null,
      member.joinedAt,
      settings.enabledAt ?? null,
    );
    const inactiveDays = computeInactiveDays(effective, now);
    const stage = classifyStage(
      inactiveDays,
      settings.thresholdDays,
      warnStage,
    );
    if (stage === INACTIVE_KICK_STAGE.NONE) continue;

    const candidate: CategorizedCandidate = {
      userId: member.userId,
      displayName: member.displayName,
      inactiveDays,
      daysLeft: computeDaysLeft(inactiveDays, settings.thresholdDays),
      warnStage,
      isMarkerTarget: isMarkerRoleTarget(inactiveDays, settings.thresholdDays),
      hasMarkerRole: member.hasMarkerRole,
    };

    if (stage === INACTIVE_KICK_STAGE.KICK) buckets.kick.push(candidate);
    else if (stage === INACTIVE_KICK_STAGE.FINAL_WARN)
      buckets.finalWarn.push(candidate);
    else buckets.weekWarn.push(candidate);
  }

  return buckets;
}
