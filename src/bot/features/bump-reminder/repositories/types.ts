// src/bot/features/bump-reminder/repositories/types.ts
// Bumpリマインダー repository の型定義

import type { BumpReminderStatus } from "../constants/bumpReminderConstants";

/**
 * Bump Reminder型定義
 */
export interface BumpReminder {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string | null; // Prismaはnullを使用
  panelMessageId: string | null; // Bumpパネルメッセージ ID (削除用)
  serviceName: string | null; // サービス名 (Disboard, Dissoku)
  scheduledAt: Date;
  status: BumpReminderStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repositoryインターフェース
 */
export interface IBumpReminderRepository {
  create(
    guildId: string,
    channelId: string,
    scheduledAt: Date,
    messageId?: string,
    panelMessageId?: string,
    serviceName?: string,
  ): Promise<BumpReminder>;
  findById(id: string): Promise<BumpReminder | null>;
  findPendingByGuildAndService(
    guildId: string,
    serviceName: string,
  ): Promise<BumpReminder | null>;
  findAllPending(): Promise<BumpReminder[]>;
  updateStatus(id: string, status: BumpReminderStatus): Promise<void>;
  delete(id: string): Promise<void>;
  cancelByGuild(guildId: string): Promise<void>;
  cancelByGuildAndChannel(guildId: string, channelId: string): Promise<void>;
  cleanupOld(daysOld?: number): Promise<number>;
}
