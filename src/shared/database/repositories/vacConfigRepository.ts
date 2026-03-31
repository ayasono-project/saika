// src/shared/database/repositories/vacConfigRepository.ts
// VAC設定リポジトリ（guild_vac_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { parseJsonArray } from "../../utils/jsonUtils";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type { IVacConfigRepository, VacChannelPair, VacConfig } from "../types";

/**
 * guild_vac_configs テーブルを使用した VAC設定リポジトリ
 */
export class VacConfigRepository implements IVacConfigRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getVacConfig(guildId: string): Promise<VacConfig | null> {
    const record = await this.prisma.guildVacConfig.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      triggerChannelIds: parseJsonArray<string>(record.triggerChannelIds),
      createdChannels: parseJsonArray<VacChannelPair>(record.createdChannels),
    };
  }

  async updateVacConfig(guildId: string, vacConfig: VacConfig): Promise<void> {
    await this.prisma.guildVacConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: vacConfig.enabled,
        triggerChannelIds: JSON.stringify(vacConfig.triggerChannelIds),
        createdChannels: JSON.stringify(vacConfig.createdChannels),
      },
      update: {
        enabled: vacConfig.enabled,
        triggerChannelIds: JSON.stringify(vacConfig.triggerChannelIds),
        createdChannels: JSON.stringify(vacConfig.createdChannels),
      },
    });
  }
}

/**
 * VAC設定リポジトリのシングルトンを取得する
 */
export const getVacConfigRepository: (
  prisma?: PrismaClient,
) => IVacConfigRepository = createRepositoryGetter<IVacConfigRepository>(
  "VacConfigRepository",
  (prisma) => new VacConfigRepository(prisma),
);
