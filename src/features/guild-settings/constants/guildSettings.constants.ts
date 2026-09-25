// ギルド設定機能の定数定義

/** reset / reset-all / import 確認ダイアログのタイムアウト（ms） */
export const CONFIRM_TIMEOUT_MS: number = 60_000;

/**
 * Bot 退出からデータ削除までの猶予日数
 *
 * 意味は「バックアップの保持期間」ではなく「うっかり外した人が気づいて
 * 入れ直すまでの猶予」。月1回しか管理画面を見ない運用や長期休暇を跨いでも
 * 救えることを優先して30日にした（2026-09-23 決定）。
 * 変更したら利用者への告知とプライバシーポリシーの保持期間も直すこと。
 */
export const GUILD_DELETION_GRACE_DAYS: number = 30;

/** 猶予切れギルドを削除する日次ジョブの固定 ID */
export const GUILD_DELETION_JOB_ID = "guild-settings:deletion-sweep";

/** 削除スイープの cron 式（毎日 4 時） */
export const GUILD_DELETION_JOB_SCHEDULE = "0 4 * * *";

/**
 * 削除スイープの cron 評価に用いるタイムゾーン
 *
 * ホストのローカルタイムに依存させず、実行時刻を固定するために明示する。
 * 未承認キックの既定タイムゾーンと揃えている。
 */
export const GUILD_DELETION_JOB_TIMEZONE = "Asia/Tokyo";

/**
 * 参加中ギルドの一覧を REST で取るときの1ページの件数
 *
 * Discord の `GET /users/@me/guilds` が1回で返せる上限（200）。
 */
export const JOINED_GUILDS_PAGE_LIMIT = 200;

/** customId 定数 */
export const GUILD_SETTINGS_CUSTOM_ID = {
  // reset
  RESET_CONFIRM: "guild-settings:reset-confirm",
  RESET_CANCEL: "guild-settings:reset-cancel",
  // reset-all
  RESET_ALL_CONFIRM: "guild-settings:reset-all-confirm",
  RESET_ALL_CANCEL: "guild-settings:reset-all-cancel",
  // import
  IMPORT_CONFIRM: "guild-settings:import-confirm",
  IMPORT_CANCEL: "guild-settings:import-cancel",
} as const;
