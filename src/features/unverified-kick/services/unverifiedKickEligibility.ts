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
 * 事前警告を送ってからの経過日数を算出する。
 * @param warnedAt 事前警告を送った時刻（未警告なら null）
 * @param now 現在時刻
 * @returns 経過日数（0 以上・未警告なら null）
 */
export function computeWarnedDaysAgo(
  warnedAt: Date | null,
  now: Date,
): number | null {
  if (!warnedAt) return null;
  return Math.max(0, differenceInDays(now, warnedAt));
}

/**
 * 経過日数・猶予日数・警告日数・警告済み状態から区分を判定する。
 * 日次チェックと preview で同一定義を共有する。
 *
 * 「ちょうど警告日に達した 1 日だけ警告」という点判定はやめ、警告済み状態（warnedAt）を
 * 用いて「通知猶予（graceDays − warnDays 日）を確保した警告を 1 回送ってからでないと
 * キックしない」不変条件を満たす。これにより日次チェックが何日飛んでも、未警告者が
 * 警告なしにキックされる（サイレントキック）ことを防ぐ。
 *
 * @param ageDays 経過日数
 * @param graceDays 猶予日数
 * @param warnDays 事前警告を送る経過日数（null なら警告無効）
 * @param warnedDaysAgo 事前警告からの経過日数（未警告なら null）
 * @returns 区分
 */
export function classifyStage(
  ageDays: number,
  graceDays: number,
  warnDays: number | null,
  warnedDaysAgo: number | null,
): UnverifiedKickStage {
  const warned = warnedDaysAgo != null;

  // 警告無効（warnDays 未設定）: 従来どおり猶予到達で即キック
  if (warnDays == null) {
    return ageDays >= graceDays
      ? UNVERIFIED_KICK_STAGE.KICK
      : UNVERIFIED_KICK_STAGE.NONE;
  }

  // 確保すべき通知猶予（warnDays < graceDays が保証されるため 1 以上）
  const noticeDays = graceDays - warnDays;

  // 猶予到達: 通知猶予を満たした警告済みのみキック
  if (ageDays >= graceDays) {
    // 未警告のまま到達（警告日を飛び越え）→ いま警告して次サイクルへ繰り延べ
    if (!warned) return UNVERIFIED_KICK_STAGE.WARN;
    // 警告済みかつ通知猶予を満たした → キック
    if (warnedDaysAgo >= noticeDays) return UNVERIFIED_KICK_STAGE.KICK;
    // 警告済みだが通知猶予が未経過 → 待機（再警告しない）
    return UNVERIFIED_KICK_STAGE.NONE;
  }

  // 警告ウィンドウ [warnDays, graceDays): 未警告なら警告、警告済みは待機
  if (ageDays >= warnDays) {
    return warned ? UNVERIFIED_KICK_STAGE.NONE : UNVERIFIED_KICK_STAGE.WARN;
  }

  // warnDays 未満 → 対象外
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
