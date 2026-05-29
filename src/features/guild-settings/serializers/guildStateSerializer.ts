// src/features/guild-settings/serializers/guildStateSerializer.ts
// guild-settings export/import の stateful データ用 serializer / deserializer
//
// staffRoleIds / buttons は jsonb 化済みのため DB 上もアプリ上も配列で、export 表現でも配列のまま透過する。
// embedData だけは export ファイル形式の安定性（旧 SQLite 版が出力した export を import できること）のため、
// export 表現では JSON 文字列のまま保持する。export 時に文字列化、import 時にパースして jsonb へ格納する。

import type {
  GuildReactionRolePanel,
  GuildTicketSettings,
  GuildTicketSettingsExport,
  OpenTicketExport,
  ReactionRolePanelExport,
  StickyEmbedData,
  StickyMessage,
  StickyMessageExport,
  Ticket,
  VacChannelPair,
} from "../../../shared/database/types";

/** GuildTicketSettings → export 表現（staffRoleIds は jsonb 配列のまま） */
export function toTicketSettingsExport(
  config: GuildTicketSettings,
): GuildTicketSettingsExport {
  return {
    categoryId: config.categoryId,
    enabled: config.enabled,
    staffRoleIds: config.staffRoleIds,
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

/** export 表現 → DB 書き込み形（staffRoleIds は jsonb 配列のまま） */
export function fromTicketSettingsExport(
  guildId: string,
  data: GuildTicketSettingsExport,
): GuildTicketSettings {
  return {
    guildId,
    categoryId: data.categoryId,
    enabled: data.enabled,
    staffRoleIds: data.staffRoleIds,
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

/** StickyMessage → export 表現（embedData は export 形式安定のため JSON 文字列へ） */
export function toStickyMessageExport(
  sticky: StickyMessage,
): StickyMessageExport {
  return {
    channelId: sticky.channelId,
    content: sticky.content,
    embedData: sticky.embedData ? JSON.stringify(sticky.embedData) : null,
    updatedBy: sticky.updatedBy,
    lastMessageId: sticky.lastMessageId,
  };
}

/** export 表現 → DB create 用データ（embedData をパースして jsonb へ。id/createdAt/updatedAt は DB 側で再生成） */
export function fromStickyMessageExport(
  guildId: string,
  data: StickyMessageExport,
): Omit<StickyMessage, "id" | "createdAt" | "updatedAt"> {
  return {
    guildId,
    channelId: data.channelId,
    content: data.content,
    embedData: data.embedData
      ? (JSON.parse(data.embedData) as StickyEmbedData)
      : null,
    updatedBy: data.updatedBy,
    lastMessageId: data.lastMessageId,
  };
}

/** GuildReactionRolePanel → export 表現（buttons は jsonb 配列のまま） */
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
    buttons: panel.buttons,
    buttonCounter: panel.buttonCounter,
  };
}

/** export 表現 → DB create 用データ（buttons は jsonb 配列のまま、id/createdAt/updatedAt は DB 側で再生成） */
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
    buttons: data.buttons,
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
