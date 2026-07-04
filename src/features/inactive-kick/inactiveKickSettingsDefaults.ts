// src/features/inactive-kick/inactiveKickSettingsDefaults.ts
// 非アクティブ自動キック設定のデフォルト値・初期化ロジック

import type {
  InactiveKickSettings,
  InactiveKickTier,
} from "../../shared/database/types";

/** 非アクティブ判定日数のデフォルト（新規階層: 在籍0日〜） */
export const DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS = 30;

/** しきい値（非アクティブ判定日数）の許容範囲 */
export const INACTIVE_KICK_THRESHOLD_MIN_DAYS = 14;
export const INACTIVE_KICK_THRESHOLD_MAX_DAYS = 365;

/** 在籍階層の在籍日数（tenureDays）の下限。上限は設けない（実在籍日数に固有の上限はないため） */
export const INACTIVE_KICK_TIER_TENURE_MIN_DAYS = 0;

/** 在籍階層の最大登録件数 */
export const INACTIVE_KICK_MAX_TIERS = 10;

/** カスタムメッセージの最大文字数 */
export const INACTIVE_KICK_MESSAGE_MAX_LENGTH = 500;

/** 非アクティブ自動キック設定の初期階層（在籍0日から現行既定値・活動判定は全種別 true を適用） */
export const DEFAULT_INACTIVE_KICK_TIERS: InactiveKickTier[] = [
  {
    tenureDays: 0,
    thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
    trackMessage: true,
    trackVoice: true,
    trackReaction: true,
  },
];

/** 非アクティブ自動キック設定の初期値 */
export const DEFAULT_INACTIVE_KICK_SETTINGS: InactiveKickSettings = {
  enabled: false,
  tiers: DEFAULT_INACTIVE_KICK_TIERS,
  whitelistRoleIds: [],
  whitelistUserIds: [],
  timezone: "Asia/Tokyo",
  runHour: 4,
  mentionEnabled: true,
};

/**
 * 階層一覧を tenureDays 昇順に正規化する（重複 tenureDays は後勝ちで除去）
 * @param tiers 正規化前の階層一覧
 * @returns tenureDays 昇順・重複除去済みの階層一覧
 */
export function normalizeInactiveKickTiers(
  tiers: InactiveKickTier[],
): InactiveKickTier[] {
  const byTenure = new Map<number, InactiveKickTier>();
  for (const tier of tiers) {
    byTenure.set(tier.tenureDays, tier);
  }
  return [...byTenure.values()].sort((a, b) => a.tenureDays - b.tenureDays);
}

/**
 * 非アクティブ自動キック設定の初期値を生成する
 * @returns デフォルト InactiveKickSettings オブジェクト
 */
export function createDefaultInactiveKickSettings(): InactiveKickSettings {
  // 配列は参照を共有しないよう都度生成する
  return {
    ...DEFAULT_INACTIVE_KICK_SETTINGS,
    tiers: DEFAULT_INACTIVE_KICK_TIERS.map((tier) => ({ ...tier })),
    whitelistRoleIds: [],
    whitelistUserIds: [],
  };
}
