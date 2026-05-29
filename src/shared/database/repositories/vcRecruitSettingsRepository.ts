// src/shared/database/repositories/vcRecruitSettingsRepository.ts
// VC募集設定リポジトリ（guild_vc_recruit_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import { parseJsonArray } from "../../utils/jsonUtils";
import { createRepositoryGetter } from "../../utils/serviceFactory";
import type {
  IVcRecruitSettingsRepository,
  VcRecruitSettings,
  VcRecruitSetup,
} from "../types";

/**
 * guild_vc_recruit_configs テーブルを使用した VC募集設定リポジトリ
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
      mentionRoleIds: parseJsonArray<string>(record.mentionRoleIds),
      setups: parseJsonArray<VcRecruitSetup>(record.setups),
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
        mentionRoleIds: JSON.stringify(vcRecruitSettings.mentionRoleIds),
        setups: JSON.stringify(vcRecruitSettings.setups),
      },
      update: {
        enabled: vcRecruitSettings.enabled,
        mentionRoleIds: JSON.stringify(vcRecruitSettings.mentionRoleIds),
        setups: JSON.stringify(vcRecruitSettings.setups),
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
