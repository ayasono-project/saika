// src/features/vac/vacSettingsRepository.ts
// VAC設定リポジトリ（guild_vac_settings テーブル）

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  IVacSettingsRepository,
  VacChannelPair,
  VacSettings,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_vac_settings テーブルを使用した VAC設定リポジトリ
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
      triggerChannelIds: record.triggerChannelIds as string[],
      createdChannels: record.createdChannels as unknown as VacChannelPair[],
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
        triggerChannelIds: vacSettings.triggerChannelIds,
        createdChannels:
          vacSettings.createdChannels as unknown as Prisma.InputJsonValue,
      },
      update: {
        enabled: vacSettings.enabled,
        triggerChannelIds: vacSettings.triggerChannelIds,
        createdChannels:
          vacSettings.createdChannels as unknown as Prisma.InputJsonValue,
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
