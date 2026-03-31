// src/bot/features/sticky-message/repositories/stickyMessageRepository.ts
// スティッキーメッセージ用リポジトリ

import type { PrismaClient } from "@prisma/client";
import type {
  IStickyMessageRepository,
  StickyMessage,
} from "../../../../shared/database/types";
import { tDefault } from "../../../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../../../shared/utils/errorHandling";

/**
 * Prisma 実装
 */
export class StickyMessageRepository implements IStickyMessageRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByChannel(channelId: string): Promise<StickyMessage | null> {
    return executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.findUnique({
          where: { channelId },
        }),
      tDefault("stickyMessage:log.database_find_by_channel_failed", {
        channelId,
      }),
    );
  }

  async findAllByGuild(guildId: string): Promise<StickyMessage[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.findMany({
          where: { guildId },
          orderBy: { createdAt: "asc" },
        }),
      tDefault("stickyMessage:log.database_find_all_by_guild_failed", {
        guildId,
      }),
    );
  }

  async create(
    guildId: string,
    channelId: string,
    content: string,
    embedData?: string,
    updatedBy?: string,
  ): Promise<StickyMessage> {
    return executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.create({
          data: {
            guildId,
            channelId,
            content,
            embedData: embedData ?? null,
            updatedBy: updatedBy ?? null,
          },
        }),
      tDefault("stickyMessage:log.database_create_failed", {
        guildId,
        channelId,
      }),
    );
  }

  async updateLastMessageId(id: string, lastMessageId: string): Promise<void> {
    await executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.update({
          where: { id },
          data: { lastMessageId },
        }),
      tDefault("stickyMessage:log.database_update_last_message_id_failed", {
        id,
      }),
    );
  }

  async updateContent(
    id: string,
    content: string,
    embedData: string | null,
    updatedBy?: string,
  ): Promise<StickyMessage> {
    return executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.update({
          where: { id },
          data: {
            content,
            embedData,
            lastMessageId: null,
            ...(updatedBy !== undefined && { updatedBy }),
          },
        }),
      tDefault("stickyMessage:log.database_update_content_failed", {
        id,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.delete({
          where: { id },
        }),
      tDefault("stickyMessage:log.database_delete_failed", { id }),
    );
  }

  async deleteByChannel(channelId: string): Promise<number> {
    const result = await executeWithDatabaseError(
      () =>
        this.prisma.stickyMessage.deleteMany({
          where: { channelId },
        }),
      tDefault("stickyMessage:log.database_delete_by_channel_failed", {
        channelId,
      }),
    );
    return result.count;
  }
}

let repository: IStickyMessageRepository | undefined;

/**
 * Prisma 実装のリポジトリを生成 / 取得する
 */
export function getStickyMessageRepository(
  prisma?: PrismaClient,
): IStickyMessageRepository {
  if (!repository) {
    if (!prisma) {
      throw new Error(
        "StickyMessageRepository is not initialized. Provide PrismaClient on first call.",
      );
    }
    repository = new StickyMessageRepository(prisma);
  }
  return repository;
}
