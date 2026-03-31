// src/shared/database/repositories/guildCoreRepository.ts
// ギルド設定コアリポジトリ（guild_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../errors/customErrors";
import { DEFAULT_LOCALE } from "../../locale/i18n";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type { GuildConfig, IGuildCoreRepository } from "../types";
import {
  deleteGuildConfigUsecase,
  existsGuildConfigUsecase,
  getGuildConfigUsecase,
  getGuildLocaleUsecase,
  saveGuildConfigUsecase,
  updateGuildConfigUsecase,
  updateGuildLocaleUsecase,
} from "./usecases/guildConfigCoreUsecases";

const DB_ERROR = {
  UNKNOWN: "unknown error",
} as const;

/**
 * guild_configs テーブルを使用したギルド設定コアリポジトリ
 */
export class GuildCoreRepository implements IGuildCoreRepository {
  private readonly prisma: PrismaClient;
  private readonly toDatabaseError = (
    prefix: string,
    error: unknown,
  ): DatabaseError =>
    new DatabaseError(
      `${prefix}: ${error instanceof Error ? error.message : DB_ERROR.UNKNOWN}`,
    );

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getConfig(guildId: string): Promise<GuildConfig | null> {
    return getGuildConfigUsecase(this.getCoreDeps(), guildId);
  }

  async saveConfig(config: GuildConfig): Promise<void> {
    await saveGuildConfigUsecase(this.getCoreDeps(), config);
  }

  async updateConfig(
    guildId: string,
    updates: Partial<GuildConfig>,
  ): Promise<void> {
    await updateGuildConfigUsecase(this.getCoreDeps(), guildId, updates);
  }

  async deleteConfig(guildId: string): Promise<void> {
    await deleteGuildConfigUsecase(this.getCoreDeps(), guildId);
  }

  async exists(guildId: string): Promise<boolean> {
    return existsGuildConfigUsecase(this.getCoreDeps(), guildId);
  }

  async getLocale(guildId: string): Promise<string> {
    return getGuildLocaleUsecase(this.getCoreDeps(), guildId);
  }

  async updateLocale(guildId: string, locale: string): Promise<void> {
    await updateGuildLocaleUsecase(this.getCoreDeps(), guildId, locale);
  }

  async updateErrorChannel(guildId: string, channelId: string): Promise<void> {
    await updateGuildConfigUsecase(this.getCoreDeps(), guildId, {
      errorChannelId: channelId,
    });
  }

  async resetGuildSettings(guildId: string): Promise<void> {
    await updateGuildConfigUsecase(this.getCoreDeps(), guildId, {
      locale: DEFAULT_LOCALE,
      errorChannelId: undefined,
    });
  }

  private getCoreDeps() {
    return {
      prisma: this.prisma,
      defaultLocale: DEFAULT_LOCALE,
      toDatabaseError: (prefix: string, error: unknown) =>
        this.toDatabaseError(prefix, error),
    };
  }
}

/**
 * ギルド設定コアリポジトリのシングルトンを取得する
 */
export const getGuildCoreRepository: (
  prisma?: PrismaClient,
) => IGuildCoreRepository = createRepositoryGetter<IGuildCoreRepository>(
  "GuildCoreRepository",
  (prisma) => new GuildCoreRepository(prisma),
);
