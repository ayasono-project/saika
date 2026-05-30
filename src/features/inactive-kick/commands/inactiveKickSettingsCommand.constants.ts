// src/features/inactive-kick/commands/inactiveKickSettingsCommand.constants.ts
// inactive-kick-settings コマンドの定数定義

/**
 * inactive-kick-settings コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const INACTIVE_KICK_SETTINGS_COMMAND = {
  NAME: "inactive-kick-settings",
  SUBCOMMAND: {
    SET_CHANNEL: "set-channel",
    SET_THRESHOLD: "set-threshold",
    ENABLE: "enable",
    DISABLE: "disable",
    SET_WARN_MESSAGE: "set-warn-message",
    CLEAR_WARN_MESSAGE: "clear-warn-message",
    SET_KICK_MESSAGE: "set-kick-message",
    CLEAR_KICK_MESSAGE: "clear-kick-message",
    SET_MARKER_ROLE: "set-marker-role",
    CLEAR_MARKER_ROLE: "clear-marker-role",
    PREVIEW: "preview",
    VIEW: "view",
    RESET: "reset",
  },
  /** whitelist サブコマンドグループ */
  GROUP: {
    WHITELIST: "whitelist",
  },
  WHITELIST_SUBCOMMAND: {
    ADD: "add",
    REMOVE: "remove",
    LIST: "list",
  },
  OPTION: {
    CHANNEL: "channel",
    DAYS: "days",
    ROLE: "role",
    USER: "user",
  },
  /** 事前通知メッセージ設定モーダルの customId */
  SET_WARN_MESSAGE_MODAL_ID: "inactive-kick-settings:warn-message-modal",
  /** キック通知メッセージ設定モーダルの customId */
  SET_KICK_MESSAGE_MODAL_ID: "inactive-kick-settings:kick-message-modal",
  /** モーダル内テキスト入力欄の customId */
  WARN_MESSAGE_MODAL_INPUT: "inactive-kick-settings:warn-message-modal-input",
  KICK_MESSAGE_MODAL_INPUT: "inactive-kick-settings:kick-message-modal-input",
  /** preview ページネーターの customId プレフィックス */
  PREVIEW_PAGINATOR_PREFIX: "inactive-kick-settings:preview",
  /** reset 確認ダイアログ */
  RESET_CONFIRM_ID: "inactive-kick-settings:reset-confirm",
  RESET_CANCEL_ID: "inactive-kick-settings:reset-cancel",
} as const;

/** preview / reset 確認のインメモリコレクター待機時間（ms） */
export const INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS = 60_000;
