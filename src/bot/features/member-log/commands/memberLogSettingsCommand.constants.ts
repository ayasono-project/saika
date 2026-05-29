// src/bot/features/member-log/commands/memberLogSettingsCommand.constants.ts
// member-log-settings コマンドの定数定義

/**
 * member-log-settings コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const MEMBER_LOG_SETTINGS_COMMAND = {
  NAME: "member-log-settings",
  SUBCOMMAND: {
    SET_CHANNEL: "set-channel",
    ENABLE: "enable",
    DISABLE: "disable",
    SET_JOIN_MESSAGE: "set-join-message",
    SET_LEAVE_MESSAGE: "set-leave-message",
    CLEAR_JOIN_MESSAGE: "clear-join-message",
    CLEAR_LEAVE_MESSAGE: "clear-leave-message",
    RESET: "reset",
    VIEW: "view",
  },
  OPTION: {
    CHANNEL: "channel",
  },
  /** 参加メッセージ設定モーダルの customId */
  SET_JOIN_MESSAGE_MODAL_ID: "member-log-settings:join-message-modal",
  /** 退出メッセージ設定モーダルの customId */
  SET_LEAVE_MESSAGE_MODAL_ID: "member-log-settings:leave-message-modal",
  /** モーダル内テキスト入力欄の customId */
  MODAL_INPUT_MESSAGE: "member-log-settings:message-modal-input",
} as const;
