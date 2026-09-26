// Bumpリマインダー機能の定数定義

import { env } from "../../../shared/config/env";

/**
 * Bumpリマインダー機能の定数
 */
export const BUMP_CONSTANTS = {
  /** Disboard Bot ID */
  DISBOARD_BOT_ID: "302050872383242240",

  /** ディス速 Bot ID */
  DISSOKU_BOT_ID: "761562078095867916",

  /** カスタムID接頭辞 */
  CUSTOM_ID_PREFIX: {
    /** ユーザー通知ONボタンの customId 接頭辞 */
    MENTION_ON: "bump-reminder:mention-on:",
    /** ユーザー通知OFFボタンの customId 接頭辞 */
    MENTION_OFF: "bump-reminder:mention-off:",
  },

  /** ジョブID接頭辞 */
  JOB_ID_PREFIX: "bump-reminder-",
} as const;

/**
 * Bumpリマインダーの状態
 */
export const BUMP_REMINDER_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  CANCELLED: "cancelled",
} as const;

/**
 * Bump検知対象のサービス名
 */
export const BUMP_SERVICES = {
  DISBOARD: "Disboard",
  DISSOKU: "Dissoku",
} as const;

/**
 * Bump検知対象のコマンド名
 */
export const BUMP_COMMANDS = {
  DISBOARD: "bump",
  DISSOKU: "up",
} as const;

/**
 * Bump検知対象のサービス名
 */
export type BumpServiceName =
  (typeof BUMP_SERVICES)[keyof typeof BUMP_SERVICES];

export type BumpReminderStatus =
  (typeof BUMP_REMINDER_STATUS)[keyof typeof BUMP_REMINDER_STATUS];

/**
 * Bot ID + コマンド名の検知ルール
 */
export const BUMP_DETECTION_RULES: readonly {
  readonly botId: string;
  readonly commandName: string;
  readonly serviceName: BumpServiceName;
}[] = [
  {
    botId: BUMP_CONSTANTS.DISBOARD_BOT_ID,
    commandName: BUMP_COMMANDS.DISBOARD,
    serviceName: BUMP_SERVICES.DISBOARD,
  },
  {
    botId: BUMP_CONSTANTS.DISSOKU_BOT_ID,
    commandName: BUMP_COMMANDS.DISSOKU,
    serviceName: BUMP_SERVICES.DISSOKU,
  },
] as const;

// 分からミリ秒へ変換するための係数
const MS_PER_MINUTE = 60 * 1000;

/** 通常運用のリマインダー遅延（分）。Disboard / ディス速の Bump の待ち時間（2時間）に合わせる */
const REMINDER_DELAY_MINUTES = 120;

/** BUMP_REMINDER_TEST_MODE 有効時の短縮遅延（分） */
const TEST_MODE_REMINDER_DELAY_MINUTES = 1;

/** 管理キーで guildId と serviceName をつなぐ区切り文字（Discord のギルドIDは数字のみで、この文字を含まない） */
const BUMP_REMINDER_KEY_SEPARATOR = ":";

/**
 * リマインダー遅延時間（分）を取得
 * モジュールロード時に固定しないよう関数として実装
 * TEST_MODE の切り替え（テスト時）を正しく反映する
 * @returns 遅延時間（分）
 */
export function getReminderDelayMinutes(): number {
  // テスト時は短縮し、通常運用では本番待機時間を返す
  return env.BUMP_REMINDER_TEST_MODE
    ? TEST_MODE_REMINDER_DELAY_MINUTES
    : REMINDER_DELAY_MINUTES;
}

/**
 * 分単位の遅延から実行予定時刻を生成
 * @param delayMinutes 現在時刻へ加算する遅延時間（分）
 * @returns 実行予定時刻
 */
export function toScheduledAt(delayMinutes: number): Date {
  // 現在時刻に遅延分を加算して実行予定時刻を生成
  return new Date(Date.now() + delayMinutes * MS_PER_MINUTE);
}

/**
 * 任意文字列が BumpServiceName か判定
 * @param value 判定対象の文字列
 * @returns value が BumpServiceName のとき true
 */
export function isBumpServiceName(value: string): value is BumpServiceName {
  // 定義済みサービス一覧との一致で判定
  return (Object.values(BUMP_SERVICES) as readonly string[]).includes(value);
}

/**
 * Bot ID とコマンド名からサービス名を解決
 * @param botId メッセージ送信元 Bot ID
 * @param commandName 実行されたコマンド名
 * @returns 一致したサービス名（未一致時は undefined）
 */
export function resolveBumpService(
  botId: string,
  commandName: string,
): BumpServiceName | undefined {
  // ルール表を先頭から探索して一致したサービスを返す
  const matchedRule = BUMP_DETECTION_RULES.find(
    (rule) => rule.botId === botId && rule.commandName === commandName,
  );
  return matchedRule?.serviceName;
}

/**
 * Bumpリマインダーの管理キーを生成（guildId + serviceName の複合キー）
 * 同一ギルドで複数サービス（Disboard・Dissoku）が独立して共存できるようにする
 * @param guildId ギルドID
 * @param serviceName サービス名（未指定時は guildId のみ）
 * @returns 管理キー
 */
export function toBumpReminderKey(
  guildId: string,
  serviceName?: BumpServiceName,
): string {
  return serviceName
    ? `${guildId}${BUMP_REMINDER_KEY_SEPARATOR}${serviceName}`
    : guildId;
}

/**
 * 管理キーを guildId と serviceName に分解する（toBumpReminderKey の逆変換）
 *
 * 既知のサービス名で終わらないキーは、キー全体を guildId として返す。
 * どの場合も `toBumpReminderKey(guildId, serviceName)` で元のキーに戻る。
 * @param reminderKey toBumpReminderKey で作った管理キー
 * @returns ギルドIDとサービス名（サービス名の無いキーでは serviceName は undefined）
 */
export function parseBumpReminderKey(reminderKey: string): {
  guildId: string;
  serviceName?: BumpServiceName;
} {
  const separatorIndex = reminderKey.indexOf(BUMP_REMINDER_KEY_SEPARATOR);
  // 区切りの無いキーはサービス名なしで登録された予約
  if (separatorIndex === -1) {
    return { guildId: reminderKey };
  }

  const serviceName = reminderKey.slice(
    separatorIndex + BUMP_REMINDER_KEY_SEPARATOR.length,
  );
  // 未知のサービス名は分解せず、キー全体をそのまま返して往復変換を保つ
  if (!isBumpServiceName(serviceName)) {
    return { guildId: reminderKey };
  }
  return { guildId: reminderKey.slice(0, separatorIndex), serviceName };
}

/**
 * BumpリマインダージョブIDを生成
 * @param guildId ジョブを識別するギルドID
 * @param serviceName サービス名（未指定時は guildId のみ）
 * @returns スケジューラー管理用のジョブID
 */
export function toBumpReminderJobId(
  guildId: string,
  serviceName?: BumpServiceName,
): string {
  // サービスごとに一意IDを組み立てる（同一ギルドの複数サービスが競合しない）
  return `${BUMP_CONSTANTS.JOB_ID_PREFIX}${toBumpReminderKey(guildId, serviceName)}`;
}
