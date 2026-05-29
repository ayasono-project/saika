// src/shared/database/types/guildSettingsExportTypes.ts
// guild-settings export/import 用の stateful データ型定義
//
// 各 *Export 型はトップレベルの guildId を共有するため、要素ごとの guildId を省略する。
// id (cuid) / createdAt / updatedAt は import 時に DB 側で再生成するため除外する。
// DB 上 JSON 文字列で保存されているフィールドはここでパース後の構造に置き換える。

import type { VacChannelPair } from "./entities";
import type { ReactionRoleButton } from "./reactionRoleTypes";

/** GuildTicketSettings の export 表現（staffRoleIds は配列に展開） */
export interface GuildTicketSettingsExport {
  categoryId: string;
  enabled: boolean;
  staffRoleIds: string[];
  panelChannelId: string;
  panelMessageId: string;
  panelTitle: string;
  panelDescription: string;
  panelColor: string;
  autoDeleteDays: number;
  maxTicketsPerUser: number;
  ticketCounter: number;
}

/** open 状態 Ticket の export 表現（status は "open" 固定で省略） */
export interface OpenTicketExport {
  categoryId: string;
  channelId: string;
  userId: string;
  ticketNumber: number;
  subject: string;
  elapsedDeleteMs: number;
}

/** StickyMessage の export 表現（embedData は DB 上の JSON 文字列をそのまま保持） */
export interface StickyMessageExport {
  channelId: string;
  content: string;
  embedData: string | null;
  updatedBy: string | null;
  lastMessageId: string | null;
}

/** GuildReactionRolePanel の export 表現（buttons は配列に展開） */
export interface ReactionRolePanelExport {
  channelId: string;
  messageId: string;
  mode: string;
  title: string;
  description: string;
  color: string;
  buttons: ReactionRoleButton[];
  buttonCounter: number;
}

/** stateful データの統合型（FullGuildSettings.state に格納される） */
export interface FullGuildState {
  ticketSettings: GuildTicketSettingsExport[];
  openTickets: OpenTicketExport[];
  stickyMessages: StickyMessageExport[];
  reactionRolePanels: ReactionRolePanelExport[];
  vacCreatedChannels: VacChannelPair[];
}

/** import 時のマージ計画（確認ダイアログに表示する「新規追加予定件数」） */
export interface ImportMergePlan {
  ticketSettingsToInsert: number;
  openTicketsToInsert: number;
  stickyMessagesToInsert: number;
  reactionRolePanelsToInsert: number;
  vacCreatedChannelsToInsert: number;
}

/** stateful の空構造（v0 形式の export ファイル互換用フォールバック） */
export function emptyFullGuildState(): FullGuildState {
  return {
    ticketSettings: [],
    openTickets: [],
    stickyMessages: [],
    reactionRolePanels: [],
    vacCreatedChannels: [],
  };
}

/** ImportMergePlan の空構造（state 不在時のフォールバック） */
export function zeroImportMergePlan(): ImportMergePlan {
  return {
    ticketSettingsToInsert: 0,
    openTicketsToInsert: 0,
    stickyMessagesToInsert: 0,
    reactionRolePanelsToInsert: 0,
    vacCreatedChannelsToInsert: 0,
  };
}
