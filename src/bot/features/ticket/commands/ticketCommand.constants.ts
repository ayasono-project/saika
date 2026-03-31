// src/bot/features/ticket/commands/ticketCommand.constants.ts
// チケットチャンネル機能のコマンド定数

export const TICKET_COMMAND = {
  NAME: "ticket",
  SUBCOMMAND: {
    CLOSE: "close",
    OPEN: "open",
    DELETE: "delete",
  },
} as const;

export const TICKET_CONFIG_COMMAND = {
  NAME: "ticket-config",
  SUBCOMMAND: {
    SETUP: "setup",
    TEARDOWN: "teardown",
    VIEW: "view",
    EDIT_PANEL: "edit-panel",
    SET_ROLES: "set-roles",
    ADD_ROLES: "add-roles",
    REMOVE_ROLES: "remove-roles",
    SET_AUTO_DELETE: "set-auto-delete",
    SET_MAX_TICKETS: "set-max-tickets",
  },
  OPTION: {
    CATEGORY: "category",
    DAYS: "days",
    COUNT: "count",
  },
} as const;

export const TICKET_CUSTOM_ID = {
  // パネルボタン（カテゴリIDを動的に付与）
  CREATE_PREFIX: "ticket:create:",
  // チケット操作ボタン（チケットIDを動的に付与）
  CLOSE_PREFIX: "ticket:close:",
  OPEN_PREFIX: "ticket:open:",
  DELETE_PREFIX: "ticket:delete:",
  DELETE_CONFIRM_PREFIX: "ticket:delete-confirm:",
  DELETE_CANCEL_PREFIX: "ticket:delete-cancel:",
  // setup フロー（セッションIDを動的に付与）
  SETUP_ROLES_PREFIX: "ticket:setup-roles:",
  SETUP_MODAL_PREFIX: "ticket:setup-modal:",
  // setup モーダルフィールド
  SETUP_MODAL_TITLE: "ticket:setup-title",
  SETUP_MODAL_DESCRIPTION: "ticket:setup-description",
  SETUP_MODAL_COLOR: "ticket:setup-color",
  // チケット作成モーダル（カテゴリIDを動的に付与）
  CREATE_MODAL_PREFIX: "ticket:create-modal:",
  CREATE_MODAL_SUBJECT: "ticket:create-subject",
  CREATE_MODAL_DETAIL: "ticket:create-detail",
  // teardown フロー
  TEARDOWN_SELECT_PREFIX: "ticket:teardown-select:",
  TEARDOWN_CONFIRM_PREFIX: "ticket:teardown-confirm:",
  TEARDOWN_CANCEL_PREFIX: "ticket:teardown-cancel:",
  // view ページネーション
  VIEW_PREFIX: "ticket",
  VIEW_SELECT_PREFIX: "ticket:view-select:",
  // edit-panel モーダル
  EDIT_PANEL_MODAL_PREFIX: "ticket:edit-panel-modal:",
  EDIT_PANEL_TITLE: "ticket:edit-panel-title",
  EDIT_PANEL_DESCRIPTION: "ticket:edit-panel-description",
  EDIT_PANEL_COLOR: "ticket:edit-panel-color",
  // set-roles / add-roles / remove-roles
  SET_ROLES_PREFIX: "ticket:set-roles:",
  ADD_ROLES_PREFIX: "ticket:add-roles:",
  REMOVE_ROLES_PREFIX: "ticket:remove-roles:",
} as const;

/** チケットステータス */
export const TICKET_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

/** パネル Embed のデフォルトカラー */
export const TICKET_DEFAULT_PANEL_COLOR = "#00A8F3";

/** 自動削除ジョブIDプレフィックス */
export const TICKET_AUTO_DELETE_JOB_PREFIX = "ticket-auto-delete-";

/** セッション TTL（14分） */
export const TICKET_SESSION_TTL_MS: number = 14 * 60 * 1000;

/** チケット一覧表示時の最大表示件数 */
export const TICKET_LIST_MAX_DISPLAY = 10;

/** ロールセレクトの最大選択数 */
export const TICKET_MAX_STAFF_ROLES = 25;

/** 通知メッセージ検索時のフェッチ上限 */
export const TICKET_MESSAGE_FETCH_LIMIT = 20;

/** デフォルト自動削除日数 */
export const TICKET_DEFAULT_AUTO_DELETE_DAYS = 7;

/** デフォルト同時チケット上限 */
export const TICKET_DEFAULT_MAX_TICKETS_PER_USER = 1;

/**
 * staffRoleIds の JSON 文字列を安全にパースする
 * パース失敗時は空配列を返す
 * @param json スタッフロールIDのJSON文字列
 * @returns ロールIDの配列（パース失敗時は空配列）
 */
export function parseStaffRoleIds(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
