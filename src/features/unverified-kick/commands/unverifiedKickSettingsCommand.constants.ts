// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.constants.ts
// unverified-kick-settings コマンドの定数定義

/**
 * unverified-kick-settings コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const UNVERIFIED_KICK_SETTINGS_COMMAND = {
  NAME: "unverified-kick-settings",
  SUBCOMMAND: {
    SET_VERIFIED_ROLE: "set-verified-role",
    SET_GRACE_DAYS: "set-grace-days",
    SET_WARN_DAYS: "set-warn-days",
    CLEAR_WARN_DAYS: "clear-warn-days",
    SET_NOTIFY_CHANNEL: "set-notify-channel",
    CLEAR_NOTIFY_CHANNEL: "clear-notify-channel",
    SET_LOG_CHANNEL: "set-log-channel",
    CLEAR_LOG_CHANNEL: "clear-log-channel",
    SET_MARKER_ROLE: "set-marker-role",
    CLEAR_MARKER_ROLE: "clear-marker-role",
    SET_DM_MESSAGE: "set-dm-message",
    CLEAR_DM_MESSAGE: "clear-dm-message",
    SET_NOTIFY_MESSAGE: "set-notify-message",
    CLEAR_NOTIFY_MESSAGE: "clear-notify-message",
    ENABLE: "enable",
    DISABLE: "disable",
    PREVIEW: "preview",
    VIEW: "view",
    RESET: "reset",
    SET_TIMEZONE: "set-timezone",
    SET_RUN_HOUR: "set-run-hour",
  },
  /** サブコマンドグループ */
  GROUP: {
    EXEMPT: "exempt",
    MENTION: "mention",
  },
  EXEMPT_SUBCOMMAND: {
    ADD: "add",
    REMOVE: "remove",
    LIST: "list",
  },
  MENTION_SUBCOMMAND: {
    ENABLE: "enable",
    DISABLE: "disable",
  },
  OPTION: {
    CHANNEL: "channel",
    DAYS: "days",
    ROLE: "role",
  },
  /** 警告 DM メッセージ設定モーダルの customId */
  SET_DM_MESSAGE_MODAL_ID: "unverified-kick-settings:dm-message-modal",
  /** モーダル内テキスト入力欄の customId */
  DM_MESSAGE_MODAL_INPUT: "unverified-kick-settings:dm-message-modal-input",
  /** キック予告メッセージ設定モーダルの customId */
  SET_NOTIFY_MESSAGE_MODAL_ID: "unverified-kick-settings:notify-message-modal",
  NOTIFY_MESSAGE_MODAL_INPUT:
    "unverified-kick-settings:notify-message-modal-input",
  /** preview ページネーターの customId プレフィックス */
  PREVIEW_PAGINATOR_PREFIX: "unverified-kick-settings:preview",
  /** exempt remove の項目選択セレクトメニュー customId */
  EXEMPT_REMOVE_SELECT_ID: "unverified-kick-settings:exempt-remove-select",
  /** reset 確認ダイアログ */
  RESET_CONFIRM_ID: "unverified-kick-settings:reset-confirm",
  RESET_CANCEL_ID: "unverified-kick-settings:reset-cancel",
  /** set-timezone インラインコレクターのセレクトメニュー customId */
  SET_TIMEZONE_SELECT_ID: "unverified-kick-settings:set-timezone-select",
  /** set-run-hour インラインコレクターのセレクトメニュー customId */
  SET_RUN_HOUR_SELECT_ID: "unverified-kick-settings:set-run-hour-select",
} as const;

/** reset 確認ダイアログのインメモリコレクター待機時間（ms） */
export const UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS = 60_000;

/** preview ページネーターのコレクター待機時間（ms） */
export const UNVERIFIED_KICK_PREVIEW_MS = 300_000;
