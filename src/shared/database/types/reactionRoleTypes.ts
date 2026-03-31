// src/shared/database/types/reactionRoleTypes.ts
// リアクションロール機能のエンティティ型定義

/** リアクションロールのモード定数 */
export const REACTION_ROLE_MODE = {
  TOGGLE: "toggle",
  ONE_ACTION: "one-action",
  EXCLUSIVE: "exclusive",
} as const;

export type ReactionRoleMode =
  (typeof REACTION_ROLE_MODE)[keyof typeof REACTION_ROLE_MODE];

export interface GuildReactionRolePanel {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  mode: string;
  title: string;
  description: string;
  color: string;
  buttons: string; // JSON: ReactionRoleButton[]
  buttonCounter: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReactionRoleButton {
  buttonId: number;
  label: string;
  emoji: string;
  style: string; // "Primary" | "Secondary" | "Success" | "Danger"
  roleIds: string[];
}
