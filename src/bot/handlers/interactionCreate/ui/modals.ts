// モーダルハンドラーレジストリ

import { memberLogSetJoinMessageModalHandler } from "../../../../features/member-log/handlers/ui/memberLogSetJoinMessageModalHandler";
import { memberLogSetLeaveMessageModalHandler } from "../../../../features/member-log/handlers/ui/memberLogSetLeaveMessageModalHandler";
import { reactionRoleAddButtonModalHandler } from "../../../../features/reaction-role/handlers/ui/reactionRoleAddButtonHandler";
import { reactionRoleEditButtonModalHandler } from "../../../../features/reaction-role/handlers/ui/reactionRoleEditButtonHandler";
import { reactionRoleEditPanelModalHandler } from "../../../../features/reaction-role/handlers/ui/reactionRoleEditPanelHandler";
import { reactionRoleSetupButtonModalHandler } from "../../../../features/reaction-role/handlers/ui/reactionRoleSetupButtonModalHandler";
import { reactionRoleSetupModalHandler } from "../../../../features/reaction-role/handlers/ui/reactionRoleSetupModalHandler";
import { stickyMessageSetEmbedModalHandler } from "../../../../features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler";
import { stickyMessageSetModalHandler } from "../../../../features/sticky-message/handlers/ui/stickyMessageSetModalHandler";
import { stickyMessageUpdateEmbedModalHandler } from "../../../../features/sticky-message/handlers/ui/stickyMessageUpdateEmbedModalHandler";
import { stickyMessageUpdateModalHandler } from "../../../../features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler";
import { ticketCreateModalHandler } from "../../../../features/ticket/handlers/ui/ticketCreateModalHandler";
import { ticketEditPanelModalHandler } from "../../../../features/ticket/handlers/ui/ticketEditPanelModalHandler";
import { ticketSetupModalHandler } from "../../../../features/ticket/handlers/ui/ticketSetupModalHandler";
import {
  unverifiedKickSetDmMessageModalHandler,
  unverifiedKickSetNotifyMessageModalHandler,
} from "../../../../features/unverified-kick/handlers/ui/unverifiedKickDmMessageModalHandler";
import { vcAutoRecruitSetMessageModalHandler } from "../../../../features/vc-auto-recruit/handlers/ui/vcAutoRecruitSetMessageModalHandler";
import type { ModalHandler } from "./types";

export const modalHandlers: ModalHandler[] = [
  // sticky-message set プレーンテキストモーダルを処理
  stickyMessageSetModalHandler,
  // sticky-message set Embed モーダルを処理
  stickyMessageSetEmbedModalHandler,
  // sticky-message update プレーンテキストモーダルを処理
  stickyMessageUpdateModalHandler,
  // sticky-message update Embed モーダルを処理
  stickyMessageUpdateEmbedModalHandler,
  // member-log-settings set-join-message モーダルを処理
  memberLogSetJoinMessageModalHandler,
  // member-log-settings set-leave-message モーダルを処理
  memberLogSetLeaveMessageModalHandler,
  // vc-auto-recruit-settings set-message モーダルを処理
  vcAutoRecruitSetMessageModalHandler,
  // unverified-kick-settings 警告 DM メッセージ設定モーダルを処理
  unverifiedKickSetDmMessageModalHandler,
  // unverified-kick-settings キック予告メッセージ設定モーダルを処理
  unverifiedKickSetNotifyMessageModalHandler,
  // リアクションロール setup パネル設定モーダルを処理
  reactionRoleSetupModalHandler,
  // リアクションロール setup ボタン設定モーダルを処理
  reactionRoleSetupButtonModalHandler,
  // リアクションロール edit-panel モーダルを処理
  reactionRoleEditPanelModalHandler,
  // リアクションロール add-button ボタン設定モーダルを処理
  reactionRoleAddButtonModalHandler,
  // リアクションロール edit-button モーダルを処理
  reactionRoleEditButtonModalHandler,
  // ticket setup モーダル（パネルタイトル・説明文入力）を処理
  ticketSetupModalHandler,
  // ticket create モーダル（件名・詳細入力）を処理
  ticketCreateModalHandler,
  // ticket edit-panel モーダル（パネル編集）を処理
  ticketEditPanelModalHandler,
];
