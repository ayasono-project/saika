// src/features/unverified-kick/services/unverifiedKickEligibility.ts
// 未承認ユーザー自動キックの判定ロジック（純関数・日次チェックと preview で共有）

import { differenceInDays } from "date-fns";

/** 段階・キックの区分 */
export const UNVERIFIED_KICK_STAGE = {
  /** 対象外 */
  NONE: "none",
  /** 事前警告（DM + チャンネル予告） */
  WARN: "warn",
  /** キック対象 */
  KICK: "kick",
} as const;

export type UnverifiedKickStage =
  (typeof UNVERIFIED_KICK_STAGE)[keyof typeof UNVERIFIED_KICK_STAGE];

/**
 * 実効参加時刻を算出する。
 * `max(joinedAt, enabledAt)` — 参加時刻を基準とし、機能を有効化した時刻 `enabledAt` を
 * 下限（floor）とする（有効化前の在籍期間を起算に含めず、有効化直後の無警告一斉キックを防ぐ）。
 * @param joinedAt サーバー参加日時（取得できなければ null）
 * @param enabledAt 機能を有効化した時刻（未有効化時 null）
 * @returns 起算に用いる実効参加時刻
 */
export function computeEffectiveJoinedAt(
  joinedAt: Date | null,
  enabledAt: Date | null,
): Date {
  const base = joinedAt ?? enabledAt ?? new Date(0);
  // enabledAt を下限とする
  if (enabledAt && enabledAt.getTime() > base.getTime()) {
    return enabledAt;
  }
  return base;
}

/**
 * 参加からの経過日数（満日数）を算出する。
 * @param effectiveJoinedAt 実効参加時刻
 * @param now 現在時刻
 * @returns 経過日数（0 以上）
 */
export function computeAgeDays(effectiveJoinedAt: Date, now: Date): number {
  return Math.max(0, differenceInDays(now, effectiveJoinedAt));
}

/**
 * キック予定までの残日数を算出する。
 * @param ageDays 経過日数
 * @param graceDays 猶予日数
 * @returns 残日数（0 以上）
 */
export function computeRemainingDays(
  ageDays: number,
  graceDays: number,
): number {
  return Math.max(0, graceDays - ageDays);
}

/**
 * 経過日数・猶予日数・警告日数から区分を判定する。
 * 日次チェックと preview で同一定義を共有する。
 * @param ageDays 経過日数
 * @param graceDays 猶予日数
 * @param warnDays 事前警告を送る経過日数（null なら警告無効）
 * @returns 区分
 */
export function classifyStage(
  ageDays: number,
  graceDays: number,
  warnDays: number | null,
): UnverifiedKickStage {
  // 猶予超過 → キック
  if (ageDays >= graceDays) {
    return UNVERIFIED_KICK_STAGE.KICK;
  }
  // ちょうど警告日（warnDays）に達した日のみ事前警告（24h ウィンドウで 1 回）
  if (warnDays != null && ageDays === warnDays) {
    return UNVERIFIED_KICK_STAGE.WARN;
  }
  return UNVERIFIED_KICK_STAGE.NONE;
}

/** 除外判定に必要な入力 */
export interface ExclusionInput {
  isBot: boolean;
  isOwner: boolean;
  isAdministrator: boolean;
  /** 認証ロールを保持しているか（= 認証済み） */
  isVerified: boolean;
  memberRoleIds: string[];
  exemptRoleIds: string[];
}

/**
 * キック対象から除外すべきメンバーかを判定する。
 * Bot / オーナー / Administrator / 認証済み / 除外ロール保持を除外する。
 * @param input 除外判定の入力
 * @returns 除外すべきなら true
 */
export function isExcluded(input: ExclusionInput): boolean {
  if (input.isBot) return true;
  if (input.isOwner) return true;
  if (input.isAdministrator) return true;
  // 認証ロール保持者は本機能の主条件で対象外
  if (input.isVerified) return true;
  if (input.memberRoleIds.some((id) => input.exemptRoleIds.includes(id))) {
    return true;
  }
  return false;
}
