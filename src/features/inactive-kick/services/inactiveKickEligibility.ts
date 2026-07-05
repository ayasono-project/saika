// src/features/inactive-kick/services/inactiveKickEligibility.ts
// 非アクティブ自動キックの判定ロジック（純関数・日次チェックと preview で共有）

import { differenceInDays } from "date-fns";
import type { InactiveKickTier } from "../../../shared/database/types";

/** 段階通知・キックの区分 */
export const INACTIVE_KICK_STAGE = {
  /** 対象外 */
  NONE: "none",
  /** 1 週間前通知 */
  WEEK_WARN: "week_warn",
  /** 最終警告（3 日前相当） */
  FINAL_WARN: "final_warn",
  /** 最終警告済み・しきい値到達待ち（通知なし・ロール維持） */
  PENDING_KICK: "pending_kick",
  /** キック対象 */
  KICK: "kick",
} as const;

export type InactiveKickStage =
  (typeof INACTIVE_KICK_STAGE)[keyof typeof INACTIVE_KICK_STAGE];

/** warnStage の段階値（0=未通知, 1=1週間前済, 2=最終警告済） */
export const WARN_STAGE = {
  NONE: 0,
  WEEK: 1,
  FINAL: 2,
} as const;

/** 1 週間前通知の起点となる「しきい値からの日数」 */
export const WEEK_WARN_OFFSET_DAYS = 7;
/** 最終警告の起点となる「しきい値からの日数」 */
export const FINAL_WARN_OFFSET_DAYS = 3;

/**
 * 実効最終活動時刻を算出する。
 * `max(lastActivityAt ?? joinedAt, enabledAt)` — 活動履歴がなければ参加日時を用い、
 * さらに有効化時刻 `enabledAt` を下限（floor）とする（有効化直後の無警告キックを防ぐ）。
 * @param lastActivityAt 活動履歴の最終活動時刻（無ければ null）
 * @param joinedAt サーバー参加日時（取得できなければ null）
 * @param enabledAt 機能を有効化した時刻（未有効化時 null）
 * @returns 起算に用いる実効最終活動時刻
 */
export function computeEffectiveLastActivity(
  lastActivityAt: Date | null,
  joinedAt: Date | null,
  enabledAt: Date | null,
): Date {
  // 活動履歴 → 参加日時 → (いずれも無ければ enabledAt → epoch)
  const base = lastActivityAt ?? joinedAt ?? enabledAt ?? new Date(0);
  // enabledAt を下限とする（有効化前の在籍期間を起算に含めない）
  if (enabledAt && enabledAt.getTime() > base.getTime()) {
    return enabledAt;
  }
  return base;
}

/**
 * 在籍日数（満日数）を算出する。
 * 階層判定専用の軸であり、`enabledAt` によるフロアは適用しない
 * （有効化した瞬間から、既存在籍者の実在籍期間がそのまま階層へ反映されるようにするため）。
 * @param joinedAt サーバー参加日時（取得できなければ null）
 * @param now 現在時刻
 * @returns 在籍日数（0 以上。joinedAt 不明時は 0）
 */
export function computeTenureDays(joinedAt: Date | null, now: Date): number {
  if (!joinedAt) return 0;
  return Math.max(0, differenceInDays(now, joinedAt));
}

/**
 * 在籍日数から適用すべき在籍階層を解決する。
 * `tenureDays <= 在籍日数` を満たす最大 tenureDays の階層を採用する。
 * 該当階層が無ければ（在籍日数が全階層の最小 tenureDays 未満）null を返す（対象外）。
 * @param tenureDays 在籍日数
 * @param tiers 在籍階層一覧（順不同で渡してよい）
 * @returns 適用すべき在籍階層（該当なしなら null）
 */
export function resolveApplicableTier(
  tenureDays: number,
  tiers: InactiveKickTier[],
): InactiveKickTier | null {
  let best: InactiveKickTier | null = null;
  for (const tier of tiers) {
    if (tier.tenureDays > tenureDays) continue;
    if (!best || tier.tenureDays > best.tenureDays) best = tier;
  }
  return best;
}

/**
 * 在籍日数締め切りモードの階層が、有効化時点で既にウィンドウ（0〜しきい値日数）を
 * 過ぎていたかを判定する。
 * 過ぎていた場合、そのメンバーは一度もこの階層で評価される機会がないまま
 * 在籍日数だけがしきい値を超えていたことになるため、以後このメンバーを
 * この階層の対象外（恒久的に対象外＝除外と同様の扱い）とする。
 * 有効化前から在籍している既存の長期在籍者に、有効化直後の遡及的な
 * 即キック判定が下るのを防ぐための保護。
 * ウィンドウがまだ開いていた（有効化時点の在籍日数がしきい値未満だった）場合や
 * `enabledAt` が不明な場合は false を返し、通常通り現在の在籍日数で判定させる。
 * @param joinedAt サーバー参加日時（取得できなければ null）
 * @param enabledAt 機能を有効化した時刻（未有効化時 null）
 * @param thresholdDays 締め切りしきい値日数
 * @returns 有効化時点で既にウィンドウが終了していれば true
 */
export function isTenureDeadlineWindowExpiredAtEnable(
  joinedAt: Date | null,
  enabledAt: Date | null,
  thresholdDays: number,
): boolean {
  if (!enabledAt) return false;
  return computeTenureDays(joinedAt, enabledAt) >= thresholdDays;
}

/** アクティブ条件の判定に使う累積回数 */
export interface ActivityCounts {
  messageCount: number;
  voiceCount: number;
  reactionCount: number;
}

/**
 * 階層にアクティブ条件（累積回数の下限）が1つでも設定されているか。
 * @param tier 判定対象の在籍階層
 * @returns いずれかの `min*Count` が設定されていれば true
 */
export function hasActiveCondition(tier: InactiveKickTier): boolean {
  return (
    tier.minMessageCount != null ||
    tier.minVoiceCount != null ||
    tier.minReactionCount != null
  );
}

/**
 * アクティブ条件を満たすか（OR条件）。
 * 条件が1つも設定されていなければ false（＝この仕組みでは免除しない）。
 * @param counts メンバーの累積活動回数
 * @param tier 判定対象の在籍階層
 * @returns 設定された種別のいずれか1つでも下限以上なら true
 */
export function meetsActiveCondition(
  counts: ActivityCounts,
  tier: InactiveKickTier,
): boolean {
  if (!hasActiveCondition(tier)) return false;
  return (
    (tier.minMessageCount != null &&
      counts.messageCount >= tier.minMessageCount) ||
    (tier.minVoiceCount != null && counts.voiceCount >= tier.minVoiceCount) ||
    (tier.minReactionCount != null &&
      counts.reactionCount >= tier.minReactionCount)
  );
}

/**
 * 非アクティブ日数（満日数）を算出する。
 * @param effectiveLastActivity 実効最終活動時刻
 * @param now 現在時刻
 * @returns 非アクティブ日数（0 以上）
 */
export function computeInactiveDays(
  effectiveLastActivity: Date,
  now: Date,
): number {
  return Math.max(0, differenceInDays(now, effectiveLastActivity));
}

/**
 * キック予定までの残日数を算出する。
 * @param inactiveDays 非アクティブ日数
 * @param thresholdDays しきい値日数
 * @returns 残日数（0 以上）
 */
export function computeDaysLeft(
  inactiveDays: number,
  thresholdDays: number,
): number {
  return Math.max(0, thresholdDays - inactiveDays);
}

/**
 * 非アクティブ日数・しきい値・警告段階から区分を判定する。
 * 日次チェックと preview で同一定義を共有する（警告ゲート: warnStage<2 はキックしない）。
 * @param inactiveDays 非アクティブ日数
 * @param thresholdDays しきい値日数
 * @param warnStage 現在の警告段階
 * @returns 区分
 */
export function classifyStage(
  inactiveDays: number,
  thresholdDays: number,
  warnStage: number,
): InactiveKickStage {
  const finalWarnStart = thresholdDays - FINAL_WARN_OFFSET_DAYS;
  const weekWarnStart = thresholdDays - WEEK_WARN_OFFSET_DAYS;

  // しきい値超過 + 最終警告済 → キック
  if (inactiveDays >= thresholdDays && warnStage >= WARN_STAGE.FINAL) {
    return INACTIVE_KICK_STAGE.KICK;
  }
  // 最終警告済み・しきい値未到達 → キック待機中（通知なし・ロール維持）
  if (inactiveDays >= finalWarnStart && warnStage >= WARN_STAGE.FINAL) {
    return INACTIVE_KICK_STAGE.PENDING_KICK;
  }
  // 最終警告（3 日前相当・未送信）→ 今回は警告のみ（警告ゲート）
  if (inactiveDays >= finalWarnStart && warnStage < WARN_STAGE.FINAL) {
    return INACTIVE_KICK_STAGE.FINAL_WARN;
  }
  // 1 週間前通知（未送信）
  if (
    inactiveDays >= weekWarnStart &&
    inactiveDays < finalWarnStart &&
    warnStage < WARN_STAGE.WEEK
  ) {
    return INACTIVE_KICK_STAGE.WEEK_WARN;
  }
  return INACTIVE_KICK_STAGE.NONE;
}

/**
 * 対象ロール付与対象か（警告段階に入っているか）を判定する。
 * @param inactiveDays 非アクティブ日数
 * @param thresholdDays しきい値日数
 * @returns 警告段階（`inactiveDays >= T - 7`）に入っていれば true
 */
export function isMarkerRoleTarget(
  inactiveDays: number,
  thresholdDays: number,
): boolean {
  return inactiveDays >= thresholdDays - WEEK_WARN_OFFSET_DAYS;
}

/** 除外判定に必要な入力 */
export interface ExclusionInput {
  isBot: boolean;
  isOwner: boolean;
  isAdministrator: boolean;
  /** 現在いずれかの VC に接続中か */
  inVoice: boolean;
  userId: string;
  memberRoleIds: string[];
  whitelistRoleIds: string[];
  whitelistUserIds: string[];
}

/**
 * キック対象から除外すべきメンバーかを判定する。
 * Bot / オーナー / Administrator / VC 接続中 / ホワイトリスト（ユーザー・ロール）を除外する。
 * @param input 除外判定の入力
 * @returns 除外すべきなら true
 */
export function isExcluded(input: ExclusionInput): boolean {
  if (input.isBot) return true;
  if (input.isOwner) return true;
  if (input.isAdministrator) return true;
  // 現在 VC に接続中は活動中とみなし対象外
  if (input.inVoice) return true;
  if (input.whitelistUserIds.includes(input.userId)) return true;
  if (input.memberRoleIds.some((id) => input.whitelistRoleIds.includes(id))) {
    return true;
  }
  return false;
}
