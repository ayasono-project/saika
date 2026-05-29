// src/shared/database/repositories/guildCoreRepository.ts
// ギルド設定コアリポジトリ（guild_configs テーブル）

import { DatabaseError } from "@ayasono/shared/core";
import type { PrismaClient } from "@prisma/client";
import type {
  GuildSettings,
  IGuildCoreRepository,
} from "../../shared/database/types";
import { DEFAULT_LOCALE } from "../../shared/locale/i18n";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";
import {
  deleteGuildSettingsUsecase,
  existsGuildSettingsUsecase,
  getGuildLocaleUsecase,
  getGuildSettingsUsecase,
  saveGuildSettingsUsecase,
  updateGuildLocaleUsecase,
  updateGuildSettingsUsecase,
} from "./usecases/guildSettingsCoreUsecases";

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

  async getSettings(guildId: string): Promise<GuildSettings | null> {
    return getGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  async saveSettings(config: GuildSettings): Promise<void> {
    await saveGuildSettingsUsecase(this.getCoreDeps(), config);
  }

  async updateSettings(
    guildId: string,
    updates: Partial<GuildSettings>,
  ): Promise<void> {
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, updates);
  }

  async deleteSettings(guildId: string): Promise<void> {
    await deleteGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  async exists(guildId: string): Promise<boolean> {
    return existsGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  async getLocale(guildId: string): Promise<string> {
    return getGuildLocaleUsecase(this.getCoreDeps(), guildId);
  }

  async updateLocale(guildId: string, locale: string): Promise<void> {
    await updateGuildLocaleUsecase(this.getCoreDeps(), guildId, locale);
  }

  async updateErrorChannel(guildId: string, channelId: string): Promise<void> {
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, {
      errorChannelId: channelId,
    });
  }

  async resetGuildSettings(guildId: string): Promise<void> {
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, {
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
