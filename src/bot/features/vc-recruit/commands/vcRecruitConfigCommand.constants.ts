// src/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants.ts
// VC募集設定コマンド定数

import { EMBED_COLORS } from "../../../../shared/constants/embedColors";

/** VC募集パネル・投稿 Embed のブランドカラー（#24B9B8） */
export const VC_RECRUIT_PANEL_COLOR: number = EMBED_COLORS.VC_RECRUIT_PANEL;

/**
 * VC招募設定コマンドで使用するコマンド名・サブコマンド名・オプション名を一元管理する
 */
export const VC_RECRUIT_CONFIG_COMMAND = {
  NAME: "vc-recruit-config",
  SUBCOMMAND: {
    SETUP: "setup",
    TEARDOWN: "teardown",
    ADD_ROLE: "add-role",
    REMOVE_ROLE: "remove-role",
    VIEW: "view",
  },
  OPTION: {
    CATEGORY: "category",
    THREAD_ARCHIVE: "thread-archive",
    ROLE: "role",
  },
  TARGET: {
    TOP: "TOP",
  },
  THREAD_ARCHIVE_CHOICES: [
    { name: "1h", value: "1h" },
    { name: "24h", value: "24h" },
    { name: "3d", value: "3d" },
    { name: "1w", value: "1w" },
  ],
  CATEGORY_CHANNEL_LIMIT: 50,
} as const;

/** スレッドアーカイブ文字列を分単位に変換するマップ */
export const THREAD_ARCHIVE_DURATION_MAP: Record<
  string,
  60 | 1440 | 4320 | 10080
> = {
  "1h": 60,
  "24h": 1440,
  "3d": 4320,
  "1w": 10080,
};

/**
 * VC募集パネル UI の customId プレフィックス定数
 * setup コマンド・各種ハンドラーで共用する
 */
export const VC_RECRUIT_PANEL_CUSTOM_ID = {
  CREATE_BUTTON_PREFIX: "vc-recruit:create:",
  MODAL_PREFIX: "vc-recruit:modal:",
  SELECT_MENTION_PREFIX: "vc-recruit:select-mention:",
  SELECT_VC_PREFIX: "vc-recruit:select-vc:",
  /** ステップ1セレクト後に押す「次へ（詳細入力）」ボタン */
  MODAL_OPEN_BUTTON_PREFIX: "vc-recruit:open-modal:",
} as const;

/**
 * VC募集メッセージ（投稿）ボタンの customId プレフィックス定数
 * フォーマット: `vc-recruit:<action>:<recruiterId>:<voiceChannelId>`
 */
export const VC_RECRUIT_POST_CUSTOM_ID = {
  /** VC名を変更ボタン */
  RENAME_VC_PREFIX: "vc-recruit:rename-vc:",
  /** VCを終了ボタン */
  END_VC_PREFIX: "vc-recruit:end-vc:",
  /** 募集を削除ボタン */
  DELETE_POST_PREFIX: "vc-recruit:delete-post:",
  /** VCを終了 確認ボタン */
  CONFIRM_END_VC_PREFIX: "vc-recruit:confirm-end-vc:",
  /** VCを終了 キャンセルボタン */
  CANCEL_END_VC_PREFIX: "vc-recruit:cancel-end-vc:",
  /** 募集を削除 確認ボタン */
  CONFIRM_DELETE_PREFIX: "vc-recruit:confirm-delete:",
  /** 募集を削除 キャンセルボタン */
  CANCEL_DELETE_PREFIX: "vc-recruit:cancel-delete:",
  /** VC名変更モーダル */
  RENAME_VC_MODAL_PREFIX: "vc-recruit:rename-vc-modal:",
} as const;

/**
 * VC募集 teardown UI の customId プレフィックス定数
 */
export const VC_RECRUIT_TEARDOWN_CUSTOM_ID = {
  SELECT_PREFIX: "vc-recruit:teardown-select:",
  CONFIRM_PREFIX: "vc-recruit:teardown-confirm:",
  CANCEL_PREFIX: "vc-recruit:teardown-cancel:",
  /** 確認パネルから選択に戻るボタン */
  REDO_PREFIX: "vc-recruit:teardown-redo:",
} as const;

/**
 * VC募集 add-role / remove-role UI の customId プレフィックス定数
 */
export const VC_RECRUIT_ROLE_CUSTOM_ID = {
  /** add-role の RoleSelectMenu */
  ADD_ROLE_SELECT_PREFIX: "vc-recruit:add-role-select:",
  /** add-role の「追加する」ボタン */
  ADD_ROLE_CONFIRM_PREFIX: "vc-recruit:add-role-confirm:",
  /** add-role の「キャンセル」ボタン */
  ADD_ROLE_CANCEL_PREFIX: "vc-recruit:add-role-cancel:",
  /** remove-role の StringSelectMenu */
  REMOVE_ROLE_SELECT_PREFIX: "vc-recruit:remove-role-select:",
  /** remove-role の「削除する」ボタン */
  REMOVE_ROLE_CONFIRM_PREFIX: "vc-recruit:remove-role-confirm:",
  /** remove-role の「キャンセル」ボタン */
  REMOVE_ROLE_CANCEL_PREFIX: "vc-recruit:remove-role-cancel:",
} as const;

/** Discord セレクトメニューのオプション上限 */
export const DISCORD_SELECT_MAX_OPTIONS = 25;

/** 募集内容テキストの最大文字数 */
export const VC_RECRUIT_CONTENT_MAX_LENGTH = 500;

/**
 * VC募集機能のタイムアウト定数
 */
export const VC_RECRUIT_TIMEOUT: {
  readonly SESSION_TTL_MS: number;
  readonly INTERACTION_TIMEOUT_MS: number;
  readonly COMPONENT_DISABLE_MS: number;
  readonly ROLE_SELECT_TIMEOUT_MS: number;
} = {
  /** Discord Interaction token の有効期限（15分）と同等のセッション TTL */
  SESSION_TTL_MS: 15 * 60 * 1000,
  /** Discord Interaction token の有効期限（15分）に対し1分のバッファを設けたタイムアウト */
  INTERACTION_TIMEOUT_MS: 14 * 60 * 1000,
  /** 確認ステップ・セレクトメニューの操作タイムアウト（60秒） */
  COMPONENT_DISABLE_MS: 60 * 1000,
  /** add-role / remove-role セレクトメニューの操作タイムアウト（3分） */
  ROLE_SELECT_TIMEOUT_MS: 3 * 60 * 1000,
};
