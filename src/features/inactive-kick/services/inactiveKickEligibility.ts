// src/features/inactive-kick/services/inactiveKickEligibility.ts
// 非アクティブ自動キックの判定ロジック（純関数・日次チェックと preview で共有）

import { differenceInDays } from "date-fns";

/** 段階通知・キックの区分 */
export const INACTIVE_KICK_STAGE = {
  /** 対象外 */
  NONE: "none",
  /** 1 週間前通知 */
  WEEK_WARN: "week_warn",
  /** 最終警告（3 日前相当） */
  FINAL_WARN: "final_warn",
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
