// src/shared/database/types/ticketTypes.ts
// チケットチャンネル機能のエンティティ型定義

export interface GuildTicketConfig {
  guildId: string;
  categoryId: string;
  enabled: boolean;
  staffRoleIds: string; // JSON: string[]
  panelChannelId: string;
  panelMessageId: string;
  panelTitle: string;
  panelDescription: string;
  panelColor: string;
  autoDeleteDays: number;
  maxTicketsPerUser: number;
  ticketCounter: number;
}

export interface Ticket {
  id: string;
  guildId: string;
  categoryId: string;
  channelId: string;
  userId: string;
  ticketNumber: number;
  subject: string;
  status: string; // "open" | "closed"
  elapsedDeleteMs: number;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
