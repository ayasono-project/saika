// src/shared/database/repositories/vacSettingsRepository.ts
// VAC設定リポジトリ（guild_vac_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  IVacSettingsRepository,
  VacChannelPair,
  VacSettings,
} from "../../shared/database/types";
import { parseJsonArray } from "../../shared/utils/jsonUtils";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_vac_configs テーブルを使用した VAC設定リポジトリ
 */
export class VacSettingsRepository implements IVacSettingsRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getVacSettings(guildId: string): Promise<VacSettings | null> {
    const record = await this.prisma.guildVacSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      triggerChannelIds: parseJsonArray<string>(record.triggerChannelIds),
      createdChannels: parseJsonArray<VacChannelPair>(record.createdChannels),
    };
  }

  async updateVacSettings(
    guildId: string,
    vacSettings: VacSettings,
  ): Promise<void> {
    await this.prisma.guildVacSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: vacSettings.enabled,
        triggerChannelIds: JSON.stringify(vacSettings.triggerChannelIds),
        createdChannels: JSON.stringify(vacSettings.createdChannels),
      },
      update: {
        enabled: vacSettings.enabled,
        triggerChannelIds: JSON.stringify(vacSettings.triggerChannelIds),
        createdChannels: JSON.stringify(vacSettings.createdChannels),
      },
    });
  }
}

/**
 * VAC設定リポジトリのシングルトンを取得する
 */
export const getVacSettingsRepository: (
  prisma?: PrismaClient,
) => IVacSettingsRepository = createRepositoryGetter<IVacSettingsRepository>(
  "VacSettingsRepository",
  (prisma) => new VacSettingsRepository(prisma),
);
