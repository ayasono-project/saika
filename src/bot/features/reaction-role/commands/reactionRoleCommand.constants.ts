// src/bot/features/reaction-role/commands/reactionRoleCommand.constants.ts
// リアクションロール機能のコマンド定数

import type { ReactionRoleButton } from "../../../../shared/database/types/reactionRoleTypes";

export const REACTION_ROLE_CONFIG_COMMAND = {
  NAME: "reaction-role-config",
  SUBCOMMAND: {
    SETUP: "setup",
    TEARDOWN: "teardown",
    VIEW: "view",
    EDIT_PANEL: "edit-panel",
    ADD_BUTTON: "add-button",
    REMOVE_BUTTON: "remove-button",
    EDIT_BUTTON: "edit-button",
  },
} as const;

export const REACTION_ROLE_CUSTOM_ID = {
  // setup フロー（セッションIDを動的に付与）
  SETUP_MODAL_PREFIX: "reaction-role:setup-modal:",
  SETUP_MODAL_TITLE: "reaction-role:setup-title",
  SETUP_MODAL_DESCRIPTION: "reaction-role:setup-description",
  SETUP_MODAL_COLOR: "reaction-role:setup-color",
  SETUP_MODE_PREFIX: "reaction-role:setup-mode:",
  SETUP_BUTTON_MODAL_PREFIX: "reaction-role:setup-button-modal:",
  SETUP_ROLES_PREFIX: "reaction-role:setup-roles:",
  SETUP_ADD_PREFIX: "reaction-role:setup-add:",
  SETUP_DONE_PREFIX: "reaction-role:setup-done:",

  // ボタン設定モーダルフィールド
  BUTTON_LABEL: "reaction-role:button-label",
  BUTTON_EMOJI: "reaction-role:button-emoji",
  BUTTON_STYLE: "reaction-role:button-style",

  // パネルボタンクリック（panelId:buttonId を動的に付与）
  CLICK_PREFIX: "reaction-role:click:",

  // teardown フロー
  TEARDOWN_SELECT_PREFIX: "reaction-role:teardown-select:",
  TEARDOWN_CONFIRM_PREFIX: "reaction-role:teardown-confirm:",
  TEARDOWN_CANCEL_PREFIX: "reaction-role:teardown-cancel:",

  // view ページネーション
  VIEW_PREFIX: "reaction-role",
  VIEW_SELECT_PREFIX: "reaction-role:view-select:",

  // edit-panel フロー
  EDIT_PANEL_SELECT_PREFIX: "reaction-role:edit-panel-select:",
  EDIT_PANEL_MODAL_PREFIX: "reaction-role:edit-panel-modal:",
  EDIT_PANEL_TITLE: "reaction-role:edit-panel-title",
  EDIT_PANEL_DESCRIPTION: "reaction-role:edit-panel-description",
  EDIT_PANEL_COLOR: "reaction-role:edit-panel-color",

  // add-button フロー
  ADD_BUTTON_SELECT_PREFIX: "reaction-role:add-button-select:",
  ADD_BUTTON_MODAL_PREFIX: "reaction-role:add-button-modal:",
  ADD_BUTTON_ROLES_PREFIX: "reaction-role:add-button-roles:",
  ADD_BUTTON_MORE_PREFIX: "reaction-role:add-button-more:",
  ADD_BUTTON_DONE_PREFIX: "reaction-role:add-button-done:",

  // remove-button フロー
  REMOVE_BUTTON_PANEL_PREFIX: "reaction-role:remove-button-panel:",
  REMOVE_BUTTON_SELECT_PREFIX: "reaction-role:remove-button-select:",
  REMOVE_BUTTON_CONFIRM_PREFIX: "reaction-role:remove-button-confirm:",
  REMOVE_BUTTON_CANCEL_PREFIX: "reaction-role:remove-button-cancel:",

  // edit-button フロー
  EDIT_BUTTON_PANEL_PREFIX: "reaction-role:edit-button-panel:",
  EDIT_BUTTON_SELECT_PREFIX: "reaction-role:edit-button-select:",
  EDIT_BUTTON_MODAL_PREFIX: "reaction-role:edit-button-modal:",
  EDIT_BUTTON_ROLES_PREFIX: "reaction-role:edit-button-roles:",
} as const;

/** パネル Embed のデフォルトカラー */
export const REACTION_ROLE_DEFAULT_PANEL_COLOR = "#00A8F3";

/** セッション TTL（14分） */
export const REACTION_ROLE_SESSION_TTL_MS: number = 14 * 60 * 1000;

/** 1パネルあたりのボタン上限（Discord上限: 5個/行 × 5行） */
export const REACTION_ROLE_MAX_BUTTONS = 25;

/** 1行あたりのボタン上限（Discord制約） */
export const REACTION_ROLE_BUTTONS_PER_ROW = 5;

/** RoleSelectMenu の最大選択数 */
export const REACTION_ROLE_MAX_ROLE_SELECT = 25;

/** ボタン一覧表示時のフィールド値上限 */
export const REACTION_ROLE_FIELD_VALUE_MAX_LENGTH = 1024;

/** ボタン一覧省略時の「他 X件」表示用の予約文字数 */
export const REACTION_ROLE_TRUNCATION_RESERVE = 50;

/** ボタンスタイルのデフォルト値 */
export const REACTION_ROLE_DEFAULT_BUTTON_STYLE = "primary";

/** 有効なボタンスタイル */
export const VALID_BUTTON_STYLES = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const;

/**
 * buttons の JSON 文字列を安全にパースする
 * パース失敗時は空配列を返す
 * @param json ボタン設定のJSON文字列
 * @returns パースされたボタン配列（失敗時は空配列）
 */
export function parseButtons(json: string): ReactionRoleButton[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ReactionRoleButton[]) : [];
  } catch {
    return [];
  }
}

/** カスタム絵文字パターン: <:name:id> または <a:name:id> */
const CUSTOM_EMOJI_REGEX = /^<a?:\w{2,32}:\d{17,19}>$/;

/** Unicode 絵文字パターン（Emoji_Presentation, Emoji+VS16, ZWJシーケンス, 国旗, スキントーン） */
const UNICODE_EMOJI_REGEX =
  /^(?:[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*[\u{1F3FB}-\u{1F3FF}]?)$/u;

/** Emoji_Presentation 文字に続く冗余な VS16 (U+FE0F) を除去する */
const REDUNDANT_VS16_REGEX = /(\p{Emoji_Presentation})\uFE0F/gu;

/**
 * 絵文字文字列を正規化する
 * Discord API が拒否する冗余な VS16（異体字セレクタ）を除去する
 * @param emoji 正規化する絵文字文字列
 * @returns 正規化された絵文字文字列
 */
export function normalizeEmoji(emoji: string): string {
  return emoji.replace(REDUNDANT_VS16_REGEX, "$1");
}

/**
 * 絵文字文字列をバリデーションする
 * 正規化後の値で判定する。空文字列は絵文字なしとして有効扱い
 * @param emoji 検証する絵文字文字列
 * @returns 有効な絵文字（または空文字列）であれば true
 */
export function isValidEmoji(emoji: string): boolean {
  if (emoji === "") return true;
  const normalized = normalizeEmoji(emoji);
  return (
    CUSTOM_EMOJI_REGEX.test(normalized) || UNICODE_EMOJI_REGEX.test(normalized)
  );
}

/**
 * ボタンスタイル文字列をバリデーションする
 * @param style 検証するスタイル文字列
 * @returns 有効なボタンスタイルであれば true
 */
export function isValidButtonStyle(
  style: string,
): style is (typeof VALID_BUTTON_STYLES)[number] {
  return (VALID_BUTTON_STYLES as readonly string[]).includes(
    style.toLowerCase(),
  );
}
