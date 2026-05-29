// src/shared/database/repositories/ticketSettingsRepository.ts
// チケット設定リポジトリ（Prisma実装）

import type { PrismaClient } from "@prisma/client";
import type {
  GuildTicketSettings,
  IGuildTicketSettingsRepository,
} from "../../shared/database/types";
import { tDefault } from "../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../shared/utils/errorHandling";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

export class TicketSettingsRepository
  implements IGuildTicketSettingsRepository
{
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByGuildAndCategory(
    guildId: string,
    categoryId: string,
  ): Promise<GuildTicketSettings | null> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketSettings.findUnique({
          where: { guildId_categoryId: { guildId, categoryId } },
        }),
      tDefault("ticket:log.database_config_find_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  async findAllByGuild(guildId: string): Promise<GuildTicketSettings[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketSettings.findMany({
          where: { guildId },
        }),
      tDefault("ticket:log.database_config_find_all_failed", { guildId }),
    );
  }

  async create(config: GuildTicketSettings): Promise<GuildTicketSettings> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketSettings.create({
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
    data: Partial<GuildTicketSettings>,
  ): Promise<GuildTicketSettings> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildTicketSettings.update({
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
        this.prisma.guildTicketSettings.delete({
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
        this.prisma.guildTicketSettings.deleteMany({
          where: { guildId },
        }),
      tDefault("ticket:log.database_config_delete_all_failed", { guildId }),
    );
    return result.count;
  }

  async incrementCounter(guildId: string, categoryId: string): Promise<number> {
    const updated = await executeWithDatabaseError(
      () =>
        this.prisma.guildTicketSettings.update({
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
export const getTicketSettingsRepository: (
  prisma?: PrismaClient,
) => IGuildTicketSettingsRepository =
  createRepositoryGetter<IGuildTicketSettingsRepository>(
    "TicketSettingsRepository",
    (prisma) => new TicketSettingsRepository(prisma),
  );
