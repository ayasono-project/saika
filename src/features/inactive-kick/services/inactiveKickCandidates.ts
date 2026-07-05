// src/features/inactive-kick/services/inactiveKickCandidates.ts
// メンバー集合からキック/段階通知の対象を区分する（純関数・日次チェックと preview で共有）

import type { InactiveKickTier } from "../../../shared/database/types";
import {
  classifyStage,
  computeDaysLeft,
  computeEffectiveLastActivity,
  computeInactiveDays,
  computeTenureDays,
  type ExclusionInput,
  INACTIVE_KICK_STAGE,
  isExcluded,
  isMarkerRoleTarget,
  isTenureDeadlineWindowExpiredAtEnable,
  meetsActiveCondition,
  resolveApplicableTier,
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

/** メンバーの活動履歴（無ければ lastActivityAt=null / warnStage=0 / 各カウント=0） */
export interface CandidateActivity {
  lastActivityAt: Date | null;
  warnStage: number;
  messageCount: number;
  voiceCount: number;
  reactionCount: number;
}

/** 区分に必要な設定値 */
export interface CandidateSettings {
  tiers: InactiveKickTier[];
  enabledAt?: Date | null;
  whitelistRoleIds: string[];
  whitelistUserIds: string[];
}

/** 区分されたメンバー 1 件 */
export interface CategorizedCandidate {
  userId: string;
  displayName: string;
  /** 判定に使った経過日数（`tier.tenureDeadline` が true なら在籍日数、それ以外は非アクティブ日数） */
  inactiveDays: number;
  daysLeft: number;
  warnStage: number;
  /** このメンバーの在籍階層から解決された適用しきい値日数 */
  thresholdDays: number;
  /** 対象ロール付与対象（警告段階に入っている）か */
  isMarkerTarget: boolean;
  /** 対象ロールを既に付与済みか */
  hasMarkerRole: boolean;
  /** 適用階層が在籍日数締め切りモードか（true なら inactiveDays は在籍日数・表示文言の出し分けに使う） */
  tenureDeadline: boolean;
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
  /** 最終警告済み・キック待機中（通知なし・ロール維持） */
  pendingKick: CategorizedCandidate[];
  /** キック対象 */
  kick: CategorizedCandidate[];
  /** 除外メンバーのうち猶予クリア（warnStage リセット・対象ロール剥奪）が必要なもの */
  graceClear: GraceClearTarget[];
  /**
   * 対象ロールを持つべき非除外メンバーの userId 集合。
   * `isMarkerRoleTarget(inactiveDays, T)` で判定するため、warnStage の段階に依存しない。
   * dead zone（週通知済み待機中・最終警告済み待機中）のメンバーも網羅される。
   */
  markerRoleTargetIds: Set<string>;
}

/**
 * メンバー集合を段階通知・キックの区分へ分類する。
 *
 * - 除外メンバー（Bot/Admin/オーナー/ホワイトリスト/VC 接続中）はキック・通知の対象外。
 *   ただし `warnStage > 0` または対象ロール付与済みのものは `graceClear` に積む（除外＝猶予リセット）。
 * - 在籍日数から適用階層を解決し、その階層のアクティブ条件（累積回数の下限）を満たすメンバーも
 *   同様に除外メンバー扱い（`graceClear`）にする。
 * - 在籍日数締め切りモードの階層は、有効化時点で既にウィンドウ（0〜しきい値日数）を
 *   過ぎていたメンバーを対象外（`graceClear`）にする。
 * - それ以外は、階層が `tenureDeadline` なら在籍日数を、そうでなければ実効最終活動時刻からの
 *   非アクティブ日数を経過日数として警告段階を判定する。
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
    pendingKick: [],
    kick: [],
    graceClear: [],
    markerRoleTargetIds: new Set(),
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

    // 在籍日数から適用階層を解決する（該当階層なし＝対象外）
    const tenureDays = computeTenureDays(member.joinedAt, now);
    const tier = resolveApplicableTier(tenureDays, settings.tiers);
    if (tier === null) continue;
    const thresholdDays = tier.thresholdDays;

    // アクティブ条件（累積回数の下限）を満たすメンバーは、非アクティブ日数に関わらず
    // 除外メンバーと同じ扱い（猶予クリア）にする
    if (
      meetsActiveCondition(
        {
          messageCount: activity?.messageCount ?? 0,
          voiceCount: activity?.voiceCount ?? 0,
          reactionCount: activity?.reactionCount ?? 0,
        },
        tier,
      )
    ) {
      if (warnStage > 0 || member.hasMarkerRole) {
        buckets.graceClear.push({
          userId: member.userId,
          hasMarkerRole: member.hasMarkerRole,
        });
      }
      continue;
    }

    // 在籍日数締め切りモードでは、有効化時点で既にこの階層のウィンドウ
    // （0〜しきい値日数）を過ぎていたメンバーを対象外にする。
    // 一度も評価される機会がないまま在籍日数だけがしきい値を超えていた
    // 既存の長期在籍者に、有効化直後の遡及的な即キック判定が下るのを防ぐ。
    if (
      tier.tenureDeadline &&
      isTenureDeadlineWindowExpiredAtEnable(
        member.joinedAt,
        settings.enabledAt ?? null,
        thresholdDays,
      )
    ) {
      if (warnStage > 0 || member.hasMarkerRole) {
        buckets.graceClear.push({
          userId: member.userId,
          hasMarkerRole: member.hasMarkerRole,
        });
      }
      continue;
    }

    // 判定に使う経過日数: 在籍日数締め切りモードなら在籍日数そのもの、
    // 通常モードなら従来通り実効最終活動時刻からの非アクティブ日数
    let inactiveDays: number;
    if (tier.tenureDeadline) {
      inactiveDays = tenureDays;
    } else {
      const effective = computeEffectiveLastActivity(
        activity?.lastActivityAt ?? null,
        member.joinedAt,
        settings.enabledAt ?? null,
      );
      inactiveDays = computeInactiveDays(effective, now);
    }

    // 対象ロール維持対象をステージに依存せず収集（dead zone のメンバーも含む）
    if (isMarkerRoleTarget(inactiveDays, thresholdDays)) {
      buckets.markerRoleTargetIds.add(member.userId);
    }

    const stage = classifyStage(inactiveDays, thresholdDays, warnStage);
    if (stage === INACTIVE_KICK_STAGE.NONE) continue;

    const candidate: CategorizedCandidate = {
      userId: member.userId,
      displayName: member.displayName,
      inactiveDays,
      daysLeft: computeDaysLeft(inactiveDays, thresholdDays),
      warnStage,
      thresholdDays,
      isMarkerTarget: isMarkerRoleTarget(inactiveDays, thresholdDays),
      hasMarkerRole: member.hasMarkerRole,
      tenureDeadline: tier.tenureDeadline ?? false,
    };

    if (stage === INACTIVE_KICK_STAGE.KICK) buckets.kick.push(candidate);
    else if (stage === INACTIVE_KICK_STAGE.PENDING_KICK)
      buckets.pendingKick.push(candidate);
    else if (stage === INACTIVE_KICK_STAGE.FINAL_WARN)
      buckets.finalWarn.push(candidate);
    else buckets.weekWarn.push(candidate);
  }

  return buckets;
}
