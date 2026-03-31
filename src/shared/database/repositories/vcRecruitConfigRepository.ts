// src/shared/database/repositories/vcRecruitConfigRepository.ts
// VC募集設定リポジトリ（guild_vc_recruit_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { parseJsonArray } from "../../utils/jsonUtils";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type {
  IVcRecruitConfigRepository,
  VcRecruitConfig,
  VcRecruitSetup,
} from "../types";

/**
 * guild_vc_recruit_configs テーブルを使用した VC募集設定リポジトリ
 */
export class VcRecruitConfigRepository implements IVcRecruitConfigRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getVcRecruitConfig(guildId: string): Promise<VcRecruitConfig | null> {
    const record = await this.prisma.guildVcRecruitConfig.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      mentionRoleIds: parseJsonArray<string>(record.mentionRoleIds),
      setups: parseJsonArray<VcRecruitSetup>(record.setups),
    };
  }

  async updateVcRecruitConfig(
    guildId: string,
    vcRecruitConfig: VcRecruitConfig,
  ): Promise<void> {
    await this.prisma.guildVcRecruitConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: vcRecruitConfig.enabled,
        mentionRoleIds: JSON.stringify(vcRecruitConfig.mentionRoleIds),
        setups: JSON.stringify(vcRecruitConfig.setups),
      },
      update: {
        enabled: vcRecruitConfig.enabled,
        mentionRoleIds: JSON.stringify(vcRecruitConfig.mentionRoleIds),
        setups: JSON.stringify(vcRecruitConfig.setups),
      },
    });
  }
}

/**
 * VC募集設定リポジトリのシングルトンを取得する
 */
export const getVcRecruitConfigRepository: (
  prisma?: PrismaClient,
) => IVcRecruitConfigRepository =
  createRepositoryGetter<IVcRecruitConfigRepository>(
    "VcRecruitConfigRepository",
    (prisma) => new VcRecruitConfigRepository(prisma),
  );
