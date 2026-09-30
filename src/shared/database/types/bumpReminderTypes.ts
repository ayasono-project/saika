// BumpReminder 関連の定数・型

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
