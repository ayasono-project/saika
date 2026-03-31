// src/shared/database/repositories/afkConfigRepository.ts
// AFK設定リポジトリ（guild_afk_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type { AfkConfig, IAfkConfigRepository } from "../types";

/**
 * guild_afk_configs テーブルを使用した AFK 設定リポジトリ
 */
export class AfkConfigRepository implements IAfkConfigRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getAfkConfig(guildId: string): Promise<AfkConfig | null> {
    const record = await this.prisma.guildAfkConfig.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      channelId: record.channelId ?? undefined,
    };
  }

  async setAfkChannel(guildId: string, channelId: string): Promise<void> {
    await this.updateAfkConfig(guildId, { enabled: true, channelId });
  }

  async updateAfkConfig(guildId: string, afkConfig: AfkConfig): Promise<void> {
    await this.prisma.guildAfkConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: afkConfig.enabled,
        channelId: afkConfig.channelId ?? null,
      },
      update: {
        enabled: afkConfig.enabled,
        channelId: afkConfig.channelId ?? null,
      },
    });
  }
}

/**
 * AFK設定リポジトリのシングルトンを取得する
 */
export const getAfkConfigRepository: (
  prisma?: PrismaClient,
) => IAfkConfigRepository = createRepositoryGetter<IAfkConfigRepository>(
  "AfkConfigRepository",
  (prisma) => new AfkConfigRepository(prisma),
);
