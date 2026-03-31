// src/shared/database/types/bumpReminderTypes.ts
// BumpReminder 関連の定数・型

export const BUMP_REMINDER_MENTION_USER_MODE = {
  // メンション対象ユーザーを追加
  ADD: "add",
  // メンション対象ユーザーを削除
  REMOVE: "remove",
} as const;

export type BumpReminderMentionUserMode =
  (typeof BUMP_REMINDER_MENTION_USER_MODE)[keyof typeof BUMP_REMINDER_MENTION_USER_MODE];

export const BUMP_REMINDER_MENTION_ROLE_RESULT = {
  // ロール設定が更新された
  UPDATED: "updated",
  // 対象設定が未初期化/未構成
  NOT_CONFIGURED: "not-configured",
} as const;

export type BumpReminderMentionRoleResult =
  (typeof BUMP_REMINDER_MENTION_ROLE_RESULT)[keyof typeof BUMP_REMINDER_MENTION_ROLE_RESULT];

export const BUMP_REMINDER_MENTION_USER_ADD_RESULT = {
  // 追加成功
  ADDED: "added",
  // 既に登録済み
  ALREADY_EXISTS: "already-exists",
  // 対象設定が未初期化/未構成
  NOT_CONFIGURED: "not-configured",
} as const;

export type BumpReminderMentionUserAddResult =
  (typeof BUMP_REMINDER_MENTION_USER_ADD_RESULT)[keyof typeof BUMP_REMINDER_MENTION_USER_ADD_RESULT];

export const BUMP_REMINDER_MENTION_USER_REMOVE_RESULT = {
  // 削除成功
  REMOVED: "removed",
  // 削除対象が存在しない
  NOT_FOUND: "not-found",
  // 対象設定が未初期化/未構成
  NOT_CONFIGURED: "not-configured",
} as const;

export type BumpReminderMentionUserRemoveResult =
  (typeof BUMP_REMINDER_MENTION_USER_REMOVE_RESULT)[keyof typeof BUMP_REMINDER_MENTION_USER_REMOVE_RESULT];

export const BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT = {
  // ユーザー一覧をクリアした
  CLEARED: "cleared",
  // もともと空で変更なし
  ALREADY_EMPTY: "already-empty",
  // 対象設定が未初期化/未構成
  NOT_CONFIGURED: "not-configured",
} as const;

export type BumpReminderMentionUsersClearResult =
  (typeof BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT)[keyof typeof BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT];

export const BUMP_REMINDER_MENTION_CLEAR_RESULT = {
  // ロール・ユーザーをまとめてクリアした
  CLEARED: "cleared",
  // もともと未設定で変更なし
  ALREADY_CLEARED: "already-cleared",
  // 対象設定が未初期化/未構成
  NOT_CONFIGURED: "not-configured",
} as const;

export type BumpReminderMentionClearResult =
  (typeof BUMP_REMINDER_MENTION_CLEAR_RESULT)[keyof typeof BUMP_REMINDER_MENTION_CLEAR_RESULT];
