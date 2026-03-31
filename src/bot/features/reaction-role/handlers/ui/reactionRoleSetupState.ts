// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupState.ts
// setup フローのセッション状態管理

import type {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type { ReactionRoleButton } from "../../../../../shared/database/types/reactionRoleTypes";
import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { REACTION_ROLE_SESSION_TTL_MS } from "../../commands/reactionRoleCommand.constants";

/** モーダル→ロール選択の間に保持するボタン情報 */
export interface PendingButtonInfo {
  label: string;
  emoji: string;
  style: string;
}

export interface ReactionRoleSetupSession {
  /** パネルのタイトル */
  title: string;
  /** パネルの説明文 */
  description: string;
  /** パネルのカラーコード */
  color: string;
  /** パネルのモード */
  mode: string;
  /** 追加中のボタン一覧 */
  buttons: ReactionRoleButton[];
  /** ボタンID採番カウンター */
  buttonCounter: number;
  /** 現在追加中のボタン情報（モーダル→ロール選択の間） */
  pendingButton?: PendingButtonInfo;
  /** 前回のモーダル送信インタラクション（エフェメラルメッセージ削除用） */
  previousReplyInteraction?: ModalSubmitInteraction;
}

export const reactionRoleSetupSessions: TtlMap<ReactionRoleSetupSession> =
  new TtlMap<ReactionRoleSetupSession>(REACTION_ROLE_SESSION_TTL_MS);

/** add-button フローのセッション */
export interface ReactionRoleAddButtonSession {
  panelId: string;
  buttons: ReactionRoleButton[];
  buttonCounter: number;
  pendingButton?: PendingButtonInfo;
  /** 前回のモーダル送信インタラクション（エフェメラルメッセージ削除用） */
  previousReplyInteraction?: ModalSubmitInteraction;
  /** コマンドインタラクション（セレクトメニューメッセージ削除用） */
  commandInteraction?: ChatInputCommandInteraction;
}

export const reactionRoleAddButtonSessions: TtlMap<ReactionRoleAddButtonSession> =
  new TtlMap<ReactionRoleAddButtonSession>(REACTION_ROLE_SESSION_TTL_MS);

/** edit-button フローのセッション */
export interface ReactionRoleEditButtonSession {
  panelId: string;
  buttonId: number;
  pendingButton?: PendingButtonInfo;
  /** コマンドインタラクション（セレクトメニューメッセージ削除用） */
  commandInteraction?: ChatInputCommandInteraction;
}

export const reactionRoleEditButtonSessions: TtlMap<ReactionRoleEditButtonSession> =
  new TtlMap<ReactionRoleEditButtonSession>(REACTION_ROLE_SESSION_TTL_MS);

/** teardown フローのセッション */
export interface ReactionRoleTeardownSession {
  panelIds: string[];
}

export const reactionRoleTeardownSessions: TtlMap<ReactionRoleTeardownSession> =
  new TtlMap<ReactionRoleTeardownSession>(REACTION_ROLE_SESSION_TTL_MS);

/** remove-button フローのセッション */
export interface ReactionRoleRemoveButtonSession {
  panelId: string;
  buttonIds: number[];
}

export const reactionRoleRemoveButtonSessions: TtlMap<ReactionRoleRemoveButtonSession> =
  new TtlMap<ReactionRoleRemoveButtonSession>(REACTION_ROLE_SESSION_TTL_MS);

/** edit-panel フローのセッション */
export interface ReactionRoleEditPanelSession {
  panelId: string;
  /** コマンドインタラクション（セレクトメニューメッセージ削除用） */
  commandInteraction?: ChatInputCommandInteraction;
}

export const reactionRoleEditPanelSessions: TtlMap<ReactionRoleEditPanelSession> =
  new TtlMap<ReactionRoleEditPanelSession>(REACTION_ROLE_SESSION_TTL_MS);
