// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.constants.ts
// vc-auto-recruit-settings コマンドの定数定義

/**
 * vc-auto-recruit-settings コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const VC_AUTO_RECRUIT_SETTINGS_COMMAND = {
  NAME: "vc-auto-recruit-settings",
  SUBCOMMAND: {
    SET_CHANNEL: "set-post-channel",
    ENABLE: "enable",
    DISABLE: "disable",
    SET_MESSAGE: "set-message",
    CLEAR_MESSAGE: "clear-message",
    SET_EMBED: "set-embed",
    ADD_CHANNEL: "add-channel",
    REMOVE_CHANNEL: "remove-channel",
    VIEW: "view",
    RESET: "reset",
  },
  OPTION: {
    CHANNEL: "channel",
    ENABLED: "enabled",
  },
  /** カスタム募集メッセージ設定モーダルの customId */
  SET_MESSAGE_MODAL_ID: "vc-auto-recruit-settings:message-modal",
  /** モーダル内テキスト入力欄の customId */
  MODAL_INPUT_MESSAGE: "vc-auto-recruit-settings:message-modal-input",
  /** 募集対象チャンネル追加セレクトメニューの customId */
  ADD_CHANNEL_SELECT_ID: "vc-auto-recruit-settings:add-channel-select",
  /** 募集対象チャンネル解除セレクトメニューの customId */
  REMOVE_CHANNEL_SELECT_ID: "vc-auto-recruit-settings:remove-channel-select",
} as const;

/** 募集対象チャンネル追加/解除セレクトメニューの操作受付タイムアウト（ms） */
export const VC_AUTO_RECRUIT_CHANNEL_SELECT_TIMEOUT_MS: number = 3 * 60 * 1000;
