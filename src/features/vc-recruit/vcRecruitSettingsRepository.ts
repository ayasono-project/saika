// src/features/vc-recruit/vcRecruitSettingsRepository.ts
// VC募集設定リポジトリ（guild_vc_recruit_settings テーブル）

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  IVcRecruitSettingsRepository,
  VcRecruitSettings,
  VcRecruitSetup,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_vc_recruit_settings テーブルを使用した VC募集設定リポジトリ
 */
export class VcRecruitSettingsRepository
  implements IVcRecruitSettingsRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getVcRecruitSettings(
    guildId: string,
  ): Promise<VcRecruitSettings | null> {
    const record = await this.prisma.guildVcRecruitSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      mentionRoleIds: record.mentionRoleIds as string[],
      setups: record.setups as unknown as VcRecruitSetup[],
    };
  }

  async updateVcRecruitSettings(
    guildId: string,
    vcRecruitSettings: VcRecruitSettings,
  ): Promise<void> {
    await this.prisma.guildVcRecruitSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: vcRecruitSettings.enabled,
        mentionRoleIds: vcRecruitSettings.mentionRoleIds,
        setups: vcRecruitSettings.setups as unknown as Prisma.InputJsonValue,
      },
      update: {
        enabled: vcRecruitSettings.enabled,
        mentionRoleIds: vcRecruitSettings.mentionRoleIds,
        setups: vcRecruitSettings.setups as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * VC募集設定リポジトリのシングルトンを取得する
 */
export const getVcRecruitSettingsRepository: (
  prisma?: PrismaClient,
) => IVcRecruitSettingsRepository =
  createRepositoryGetter<IVcRecruitSettingsRepository>(
    "VcRecruitSettingsRepository",
    (prisma) => new VcRecruitSettingsRepository(prisma),
  );
