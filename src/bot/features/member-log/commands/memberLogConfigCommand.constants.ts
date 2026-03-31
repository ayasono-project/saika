// src/bot/features/member-log/commands/memberLogConfigCommand.constants.ts
// member-log-config コマンドの定数定義

/**
 * member-log-config コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const MEMBER_LOG_CONFIG_COMMAND = {
  NAME: "member-log-config",
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
  SET_JOIN_MESSAGE_MODAL_ID: "member-log-config:join-message-modal",
  /** 退出メッセージ設定モーダルの customId */
  SET_LEAVE_MESSAGE_MODAL_ID: "member-log-config:leave-message-modal",
  /** モーダル内テキスト入力欄の customId */
  MODAL_INPUT_MESSAGE: "member-log-config:message-modal-input",
} as const;
