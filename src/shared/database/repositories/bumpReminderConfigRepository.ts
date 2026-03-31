// src/shared/database/repositories/bumpReminderConfigRepository.ts
// Bumpリマインダー設定リポジトリ（guild_bump_reminder_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { parseJsonArray } from "../../utils/jsonUtils";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
  type BumpReminderConfig,
  type BumpReminderMentionClearResult,
  type BumpReminderMentionRoleResult,
  type BumpReminderMentionUserAddResult,
  type BumpReminderMentionUserRemoveResult,
  type BumpReminderMentionUsersClearResult,
  type IBumpReminderConfigRepository,
} from "../types";

/**
 * guild_bump_reminder_configs テーブルを使用した Bumpリマインダー設定リポジトリ
 */
export class BumpReminderConfigRepository
  implements IBumpReminderConfigRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getBumpReminderConfig(
    guildId: string,
  ): Promise<BumpReminderConfig | null> {
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      channelId: record.channelId ?? undefined,
      mentionRoleId: record.mentionRoleId ?? undefined,
      mentionUserIds: parseJsonArray<string>(record.mentionUserIds),
    };
  }

  async setBumpReminderEnabled(
    guildId: string,
    enabled: boolean,
    channelId?: string,
  ): Promise<void> {
    await this.prisma.guildBumpReminderConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled,
        channelId: channelId ?? null,
        mentionUserIds: "[]",
      },
      update: {
        enabled,
        ...(channelId !== undefined ? { channelId } : {}),
      },
    });
  }

  async updateBumpReminderConfig(
    guildId: string,
    bumpReminderConfig: BumpReminderConfig,
  ): Promise<void> {
    await this.prisma.guildBumpReminderConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: bumpReminderConfig.enabled,
        channelId: bumpReminderConfig.channelId ?? null,
        mentionRoleId: bumpReminderConfig.mentionRoleId ?? null,
        mentionUserIds: JSON.stringify(bumpReminderConfig.mentionUserIds),
      },
      update: {
        enabled: bumpReminderConfig.enabled,
        channelId: bumpReminderConfig.channelId ?? null,
        mentionRoleId: bumpReminderConfig.mentionRoleId ?? null,
        mentionUserIds: JSON.stringify(bumpReminderConfig.mentionUserIds),
      },
    });
  }

  async setBumpReminderMentionRole(
    guildId: string,
    roleId: string | undefined,
  ): Promise<BumpReminderMentionRoleResult> {
    // 存在確認のみなので最小フィールドで問い合わせ
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
      select: { guildId: true },
    });
    if (!record) return BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED;

    await this.prisma.guildBumpReminderConfig.update({
      where: { guildId },
      data: { mentionRoleId: roleId ?? null },
    });
    return BUMP_REMINDER_MENTION_ROLE_RESULT.UPDATED;
  }

  async addBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserAddResult> {
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
      select: { mentionUserIds: true },
    });
    if (!record) return BUMP_REMINDER_MENTION_USER_ADD_RESULT.NOT_CONFIGURED;

    const mentionUserIds = parseJsonArray<string>(record.mentionUserIds);
    if (mentionUserIds.includes(userId)) {
      return BUMP_REMINDER_MENTION_USER_ADD_RESULT.ALREADY_EXISTS;
    }

    await this.prisma.guildBumpReminderConfig.update({
      where: { guildId },
      data: {
        mentionUserIds: JSON.stringify([...mentionUserIds, userId]),
      },
    });
    return BUMP_REMINDER_MENTION_USER_ADD_RESULT.ADDED;
  }

  async removeBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserRemoveResult> {
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
      select: { mentionUserIds: true },
    });
    if (!record) {
      return BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.NOT_CONFIGURED;
    }

    const mentionUserIds = parseJsonArray<string>(record.mentionUserIds);
    if (!mentionUserIds.includes(userId)) {
      return BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.NOT_FOUND;
    }

    await this.prisma.guildBumpReminderConfig.update({
      where: { guildId },
      data: {
        mentionUserIds: JSON.stringify(
          mentionUserIds.filter((id) => id !== userId),
        ),
      },
    });
    return BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.REMOVED;
  }

  async clearBumpReminderMentionUsers(
    guildId: string,
  ): Promise<BumpReminderMentionUsersClearResult> {
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
      select: { mentionUserIds: true },
    });
    if (!record) {
      return BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.NOT_CONFIGURED;
    }

    const mentionUserIds = parseJsonArray<string>(record.mentionUserIds);
    if (mentionUserIds.length === 0) {
      return BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.ALREADY_EMPTY;
    }

    await this.prisma.guildBumpReminderConfig.update({
      where: { guildId },
      data: { mentionUserIds: "[]" },
    });
    return BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT.CLEARED;
  }

  async clearBumpReminderMentions(
    guildId: string,
  ): Promise<BumpReminderMentionClearResult> {
    const record = await this.prisma.guildBumpReminderConfig.findUnique({
      where: { guildId },
      select: { mentionRoleId: true, mentionUserIds: true },
    });
    if (!record) {
      return BUMP_REMINDER_MENTION_CLEAR_RESULT.NOT_CONFIGURED;
    }

    const mentionUserIds = parseJsonArray<string>(record.mentionUserIds);
    if (!record.mentionRoleId && mentionUserIds.length === 0) {
      return BUMP_REMINDER_MENTION_CLEAR_RESULT.ALREADY_CLEARED;
    }

    await this.prisma.guildBumpReminderConfig.update({
      where: { guildId },
      data: { mentionRoleId: null, mentionUserIds: "[]" },
    });
    return BUMP_REMINDER_MENTION_CLEAR_RESULT.CLEARED;
  }
}

/**
 * Bumpリマインダー設定リポジトリのシングルトンを取得する
 */
export const getBumpReminderConfigRepository: (
  prisma?: PrismaClient,
) => IBumpReminderConfigRepository =
  createRepositoryGetter<IBumpReminderConfigRepository>(
    "BumpReminderConfigRepository",
    (prisma) => new BumpReminderConfigRepository(prisma),
  );
