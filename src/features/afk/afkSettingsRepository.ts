// src/shared/database/repositories/afkSettingsRepository.ts
// AFK設定リポジトリ（guild_afk_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  AfkSettings,
  IAfkSettingsRepository,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_afk_configs テーブルを使用した AFK 設定リポジトリ
 */
export class AfkSettingsRepository implements IAfkSettingsRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getAfkSettings(guildId: string): Promise<AfkSettings | null> {
    const record = await this.prisma.guildAfkSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      channelId: record.channelId ?? undefined,
    };
  }

  async setAfkChannel(guildId: string, channelId: string): Promise<void> {
    await this.updateAfkSettings(guildId, { enabled: true, channelId });
  }

  async updateAfkSettings(
    guildId: string,
    afkSettings: AfkSettings,
  ): Promise<void> {
    await this.prisma.guildAfkSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: afkSettings.enabled,
        channelId: afkSettings.channelId ?? null,
      },
      update: {
        enabled: afkSettings.enabled,
        channelId: afkSettings.channelId ?? null,
      },
    });
  }
}

/**
 * AFK設定リポジトリのシングルトンを取得する
 */
export const getAfkSettingsRepository: (
  prisma?: PrismaClient,
) => IAfkSettingsRepository = createRepositoryGetter<IAfkSettingsRepository>(
  "AfkSettingsRepository",
  (prisma) => new AfkSettingsRepository(prisma),
);
