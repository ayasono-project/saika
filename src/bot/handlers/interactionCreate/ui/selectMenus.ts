// src/bot/handlers/interactionCreate/ui/selectMenus.ts
// セレクトメニューハンドラのレジストリ

import { guildConfigViewSelectHandler } from "../../../features/guild-config/handlers/ui/guildConfigViewSelectHandler";
import {
  reactionRoleAddButtonRoleSelectHandler,
  reactionRoleAddButtonSelectHandler,
} from "../../../features/reaction-role/handlers/ui/reactionRoleAddButtonHandler";
import {
  reactionRoleEditButtonPanelSelectHandler,
  reactionRoleEditButtonRoleSelectHandler,
  reactionRoleEditButtonSelectHandler,
} from "../../../features/reaction-role/handlers/ui/reactionRoleEditButtonHandler";
import { reactionRoleEditPanelSelectHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleEditPanelHandler";
import {
  reactionRoleRemoveButtonPanelSelectHandler,
  reactionRoleRemoveButtonSelectHandler,
} from "../../../features/reaction-role/handlers/ui/reactionRoleRemoveButtonHandler";
import { reactionRoleSetupModeSelectHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleSetupModeSelectHandler";
import { reactionRoleSetupRoleSelectHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleSetupRoleSelectHandler";
import { reactionRoleTeardownSelectHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleTeardownHandler";
import { reactionRoleViewSelectHandler } from "../../../features/reaction-role/handlers/ui/reactionRoleViewHandler";
import { stickyMessageRemoveSelectHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler";
import { stickyMessageViewSelectHandler } from "../../../features/sticky-message/handlers/ui/stickyMessageViewSelectHandler";
import { ticketRoleSelectHandler } from "../../../features/ticket/handlers/ui/ticketRoleSelectHandler";
import { ticketSetupRoleSelectHandler } from "../../../features/ticket/handlers/ui/ticketSetupRoleSelectHandler";
import { ticketTeardownSelectHandler } from "../../../features/ticket/handlers/ui/ticketTeardownSelectHandler";
import { ticketViewSelectHandler } from "../../../features/ticket/handlers/ui/ticketViewSelectHandler";
import { vcPanelUserSelectHandler } from "../../../features/vc-panel/handlers/ui/vcPanelUserSelect";
import { vcRecruitAddRoleSelectHandler } from "../../../features/vc-recruit/handlers/ui/vcRecruitAddRoleSelectHandler";
import { vcRecruitRemoveRoleSelectHandler } from "../../../features/vc-recruit/handlers/ui/vcRecruitRemoveRoleSelectHandler";
import { vcRecruitStringSelectHandler } from "../../../features/vc-recruit/handlers/ui/vcRecruitStringSelect";
import type {
  RoleSelectHandler,
  StringSelectHandler,
  UserSelectHandler,
} from "./types";

export const userSelectHandlers: UserSelectHandler[] = [];

export const roleSelectHandlers: RoleSelectHandler[] = [
  // リアクションロール setup のロール選択を処理
  reactionRoleSetupRoleSelectHandler,
  // リアクションロール add-button のロール選択を処理
  reactionRoleAddButtonRoleSelectHandler,
  // リアクションロール edit-button のロール選択を処理
  reactionRoleEditButtonRoleSelectHandler,
  // チケット setup のスタッフロール選択を処理
  ticketSetupRoleSelectHandler,
  // チケット set-roles / add-roles / remove-roles のロール選択を処理
  ticketRoleSelectHandler,
  // VC募集 add-role のロール選択を処理
  vcRecruitAddRoleSelectHandler,
];

export const stringSelectHandlers: StringSelectHandler[] = [
  // guild-config view ページセレクトメニューを処理
  guildConfigViewSelectHandler,
  // リアクションロール setup のモード選択を処理
  reactionRoleSetupModeSelectHandler,
  // リアクションロール teardown のパネル選択を処理
  reactionRoleTeardownSelectHandler,
  // リアクションロール view のパネル選択を処理
  reactionRoleViewSelectHandler,
  // リアクションロール edit-panel のパネル選択を処理
  reactionRoleEditPanelSelectHandler,
  // リアクションロール add-button のパネル選択を処理
  reactionRoleAddButtonSelectHandler,
  // リアクションロール remove-button のパネル選択を処理
  reactionRoleRemoveButtonPanelSelectHandler,
  // リアクションロール remove-button のボタン選択を処理
  reactionRoleRemoveButtonSelectHandler,
  // リアクションロール edit-button のパネル選択を処理
  reactionRoleEditButtonPanelSelectHandler,
  // リアクションロール edit-button のボタン選択を処理
  reactionRoleEditButtonSelectHandler,
  // sticky-message remove コマンドのチャンネル選択を処理
  stickyMessageRemoveSelectHandler,
  // sticky-message view コマンドのチャンネル選択を処理
  stickyMessageViewSelectHandler,
  // VC操作パネルの AFK 移動ユーザー選択を処理（VAC・VC募集など共用）
  vcPanelUserSelectHandler,
  // VC募集のメンション/VC選択を処理
  vcRecruitStringSelectHandler,
  // VC募集 remove-role のロール選択を処理
  vcRecruitRemoveRoleSelectHandler,
  // チケット teardown のカテゴリ選択を処理
  ticketTeardownSelectHandler,
  // チケット view のカテゴリ選択を処理
  ticketViewSelectHandler,
];
