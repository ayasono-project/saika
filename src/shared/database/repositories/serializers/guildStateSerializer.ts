// src/shared/database/repositories/serializers/guildStateSerializer.ts
// guild-settings export/import の stateful データ用 serializer / deserializer
//
// JSON 文字列カラム（staffRoleIds / buttons）を export 時にパースし、import 時に再シリアライズする。
// embedData は仕様書 §データモデルで「DB 上の JSON 文字列をそのまま保持」と定められているため透過する。

import { parseJsonArray } from "../../../utils/jsonUtils";
import type {
  GuildReactionRolePanel,
  GuildTicketSettings,
  GuildTicketSettingsExport,
  OpenTicketExport,
  ReactionRoleButton,
  ReactionRolePanelExport,
  StickyMessage,
  StickyMessageExport,
  Ticket,
  VacChannelPair,
} from "../../types";

/** GuildTicketSettings → export 表現（staffRoleIds をパース） */
export function toTicketSettingsExport(
  config: GuildTicketSettings,
): GuildTicketSettingsExport {
  return {
    categoryId: config.categoryId,
    enabled: config.enabled,
    staffRoleIds: parseJsonArray<string>(config.staffRoleIds),
    panelChannelId: config.panelChannelId,
    panelMessageId: config.panelMessageId,
    panelTitle: config.panelTitle,
    panelDescription: config.panelDescription,
    panelColor: config.panelColor,
    autoDeleteDays: config.autoDeleteDays,
    maxTicketsPerUser: config.maxTicketsPerUser,
    ticketCounter: config.ticketCounter,
  };
}

/** export 表現 → DB 書き込み形（staffRoleIds を再シリアライズ） */
export function fromTicketSettingsExport(
  guildId: string,
  data: GuildTicketSettingsExport,
): GuildTicketSettings {
  return {
    guildId,
    categoryId: data.categoryId,
    enabled: data.enabled,
    staffRoleIds: JSON.stringify(data.staffRoleIds),
    panelChannelId: data.panelChannelId,
    panelMessageId: data.panelMessageId,
    panelTitle: data.panelTitle,
    panelDescription: data.panelDescription,
    panelColor: data.panelColor,
    autoDeleteDays: data.autoDeleteDays,
    maxTicketsPerUser: data.maxTicketsPerUser,
    ticketCounter: data.ticketCounter,
  };
}

/** Ticket (open のみ) → export 表現 */
export function toOpenTicketExport(ticket: Ticket): OpenTicketExport {
  return {
    categoryId: ticket.categoryId,
    channelId: ticket.channelId,
    userId: ticket.userId,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    elapsedDeleteMs: ticket.elapsedDeleteMs,
  };
}

/** export 表現 → DB create 用データ（id/createdAt/updatedAt は DB 側で再生成、status は "open" 固定） */
export function fromOpenTicketExport(
  guildId: string,
  data: OpenTicketExport,
): Omit<Ticket, "id" | "createdAt" | "updatedAt"> {
  return {
    guildId,
    categoryId: data.categoryId,
    channelId: data.channelId,
    userId: data.userId,
    ticketNumber: data.ticketNumber,
    subject: data.subject,
    status: "open",
    elapsedDeleteMs: data.elapsedDeleteMs,
    closedAt: null,
  };
}

/** StickyMessage → export 表現（embedData は JSON 文字列のまま透過） */
export function toStickyMessageExport(
  sticky: StickyMessage,
): StickyMessageExport {
  return {
    channelId: sticky.channelId,
    content: sticky.content,
    embedData: sticky.embedData,
    updatedBy: sticky.updatedBy,
    lastMessageId: sticky.lastMessageId,
  };
}

/** export 表現 → DB create 用データ（id/createdAt/updatedAt は DB 側で再生成） */
export function fromStickyMessageExport(
  guildId: string,
  data: StickyMessageExport,
): Omit<StickyMessage, "id" | "createdAt" | "updatedAt"> {
  return {
    guildId,
    channelId: data.channelId,
    content: data.content,
    embedData: data.embedData,
    updatedBy: data.updatedBy,
    lastMessageId: data.lastMessageId,
  };
}

/** GuildReactionRolePanel → export 表現（buttons をパース） */
export function toReactionRolePanelExport(
  panel: GuildReactionRolePanel,
): ReactionRolePanelExport {
  return {
    channelId: panel.channelId,
    messageId: panel.messageId,
    mode: panel.mode,
    title: panel.title,
    description: panel.description,
    color: panel.color,
    buttons: parseJsonArray<ReactionRoleButton>(panel.buttons),
    buttonCounter: panel.buttonCounter,
  };
}

/** export 表現 → DB create 用データ（buttons を再シリアライズ、id/createdAt/updatedAt は DB 側で再生成） */
export function fromReactionRolePanelExport(
  guildId: string,
  data: ReactionRolePanelExport,
): Omit<GuildReactionRolePanel, "id" | "createdAt" | "updatedAt"> {
  return {
    guildId,
    channelId: data.channelId,
    messageId: data.messageId,
    mode: data.mode,
    title: data.title,
    description: data.description,
    color: data.color,
    buttons: JSON.stringify(data.buttons),
    buttonCounter: data.buttonCounter,
  };
}

/**
 * VAC createdChannels の union マージ。
 * voiceChannelId 一致は既存優先（incoming はスキップ）。
 */
export function mergeVacCreatedChannels(
  existing: VacChannelPair[],
  incoming: VacChannelPair[],
): VacChannelPair[] {
  const existingIds = new Set(existing.map((c) => c.voiceChannelId));
  const additions = incoming.filter((c) => !existingIds.has(c.voiceChannelId));
  return [...existing, ...additions];
}
