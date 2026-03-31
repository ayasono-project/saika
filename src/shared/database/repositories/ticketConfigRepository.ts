// src/shared/database/repositories/ticketConfigRepository.ts
// チケット設定リポジトリ（Prisma実装）

import type { PrismaClient } from "@prisma/client";
import { tDefault } from "../../locale/localeManager";
import { executeWithDatabaseError } from "../../utils/errorHandling";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type { GuildTicketConfig, IGuildTicketConfigRepository } from "../types";

export class TicketConfigRepository implements IGuildTicketConfigRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByGuildAndCategory(
    guildId: string,
    categoryId: string,
  ): Promise<GuildTicketConfig | null> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.findUnique({
          where: { guildId_categoryId: { guildId, categoryId } },
        }),
      tDefault("ticket:log.database_config_find_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  async findAllByGuild(guildId: string): Promise<GuildTicketConfig[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.findMany({
          where: { guildId },
        }),
      tDefault("ticket:log.database_config_find_all_failed", { guildId }),
    );
  }

  async create(config: GuildTicketConfig): Promise<GuildTicketConfig> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.create({
          data: config,
        }),
      tDefault("ticket:log.database_config_save_failed", {
        guildId: config.guildId,
        categoryId: config.categoryId,
      }),
    );
  }

  async update(
    guildId: string,
    categoryId: string,
    data: Partial<GuildTicketConfig>,
  ): Promise<GuildTicketConfig> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.update({
          where: { guildId_categoryId: { guildId, categoryId } },
          data,
        }),
      tDefault("ticket:log.database_config_save_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  async delete(guildId: string, categoryId: string): Promise<void> {
    await executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.delete({
          where: { guildId_categoryId: { guildId, categoryId } },
        }),
      tDefault("ticket:log.database_config_delete_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  async deleteAllByGuild(guildId: string): Promise<number> {
    const result = await executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.deleteMany({
          where: { guildId },
        }),
      tDefault("ticket:log.database_config_delete_all_failed", { guildId }),
    );
    return result.count;
  }

  async incrementCounter(guildId: string, categoryId: string): Promise<number> {
    const updated = await executeWithDatabaseError(
      () =>
        this.prisma.guildTicketConfig.update({
          where: { guildId_categoryId: { guildId, categoryId } },
          data: { ticketCounter: { increment: 1 } },
        }),
      tDefault("ticket:log.database_config_increment_counter_failed", {
        guildId,
        categoryId,
      }),
    );
    return updated.ticketCounter;
  }
}

/**
 * チケット設定リポジトリのシングルトンを取得する
 */
export const getTicketConfigRepository: (
  prisma?: PrismaClient,
) => IGuildTicketConfigRepository =
  createRepositoryGetter<IGuildTicketConfigRepository>(
    "TicketConfigRepository",
    (prisma) => new TicketConfigRepository(prisma),
  );
