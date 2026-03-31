// src/bot/handlers/interactionCreate/ui/modals.ts
// モーダルハンドラーレジストリ

import { memberLogSetJoinMessageModalHandler } from "../../../features/member-log/handlers/ui/memberLogSetJoinMessageModalHandler";
import { memberLogSetLeaveMessageModalHandler } from "../../../features/member-log/handlers/ui/memberLogSetLeaveMessageModalHandler";
import { reactionRoleAddButtonModalHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleAddButtonHandler";
import { reactionRoleEditButtonModalHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleEditButtonHandler";
import { reactionRoleEditPanelModalHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleEditPanelHandler";
import { reactionRoleSetupButtonModalHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleSetupButtonModalHandler";
import { reactionRoleSetupModalHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleSetupModalHandler";
import { stickyMessageSetEmbedModalHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageSetEmbedModalHandler";
import { stickyMessageSetModalHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageSetModalHandler";
import { stickyMessageUpdateEmbedModalHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageUpdateEmbedModalHandler";
import { stickyMessageUpdateModalHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler";
import { ticketCreateModalHandler } from "../../../features/ticket/handlers/ui/ticketCreateModalHandler";
import { ticketEditPanelModalHandler } from "../../../features/ticket/handlers/ui/ticketEditPanelModalHandler";
import { ticketSetupModalHandler } from "../../../features/ticket/handlers/ui/ticketSetupModalHandler";
import { vcPanelModalHandler } from "../../../features/vc-panel/handlers/ui/vcPanelModal";
import { vcRecruitModalHandler } from "../../../features/vc-recruit/handlers/ui/vcRecruitModal";
import { vcRecruitRenameModalHandler } from "../../../features/vc-recruit/handlers/ui/vcRecruitRenameModal";
import type { ModalHandler } from "./types";

export const modalHandlers: ModalHandler[] = [
  // VC操作パネルのモーダル送信を処理（VAC・VC募集など共用）
  vcPanelModalHandler,
  // VC募集モーダル送信（ステップ1→2）を処理
  vcRecruitModalHandler,
  // VC募集メッセージからのVC名変更モーダルを処理
  vcRecruitRenameModalHandler,
  // sticky-message set プレーンテキストモーダルを処理
  stickyMessageSetModalHandler,
  // sticky-message set Embed モーダルを処理
  stickyMessageSetEmbedModalHandler,
  // sticky-message update プレーンテキストモーダルを処理
  stickyMessageUpdateModalHandler,
  // sticky-message update Embed モーダルを処理
  stickyMessageUpdateEmbedModalHandler,
  // member-log-config set-join-message モーダルを処理
  memberLogSetJoinMessageModalHandler,
  // member-log-config set-leave-message モーダルを処理
  memberLogSetLeaveMessageModalHandler,
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
