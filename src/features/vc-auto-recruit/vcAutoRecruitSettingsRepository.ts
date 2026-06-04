// src/features/vc-auto-recruit/vcAutoRecruitSettingsRepository.ts
// VC自動募集設定リポジトリ（guild_vc_invite_settings テーブル）

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  IVcAutoRecruitSettingsRepository,
  VcAutoRecruitRef,
  VcAutoRecruitSettings,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_vc_invite_settings テーブルを使用した VC自動募集設定リポジトリ
 */
export class VcAutoRecruitSettingsRepository
  implements IVcAutoRecruitSettingsRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * VC自動募集設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns 設定（未設定時は null）
   */
  async getVcAutoRecruitSettings(
    guildId: string,
  ): Promise<VcAutoRecruitSettings | null> {
    const record = await this.prisma.guildVcAutoRecruitSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      channelId: record.channelId ?? undefined,
      message: record.message ?? undefined,
      embedEnabled: record.embedEnabled,
      activeInvites: record.activeInvites as unknown as VcAutoRecruitRef[],
    };
  }

  /**
   * VC自動募集設定を永続化する
   * @param guildId 設定対象のギルドID
   * @param vcAutoRecruitSettings 保存する設定
   */
  async updateVcAutoRecruitSettings(
    guildId: string,
    vcAutoRecruitSettings: VcAutoRecruitSettings,
  ): Promise<void> {
    await this.prisma.guildVcAutoRecruitSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: vcAutoRecruitSettings.enabled,
        channelId: vcAutoRecruitSettings.channelId ?? null,
        message: vcAutoRecruitSettings.message ?? null,
        embedEnabled: vcAutoRecruitSettings.embedEnabled,
        activeInvites:
          vcAutoRecruitSettings.activeInvites as unknown as Prisma.InputJsonValue,
      },
      update: {
        enabled: vcAutoRecruitSettings.enabled,
        channelId: vcAutoRecruitSettings.channelId ?? null,
        message: vcAutoRecruitSettings.message ?? null,
        embedEnabled: vcAutoRecruitSettings.embedEnabled,
        activeInvites:
          vcAutoRecruitSettings.activeInvites as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * VC自動募集設定リポジトリのシングルトンを取得する
 */
export const getVcAutoRecruitSettingsRepository: (
  prisma?: PrismaClient,
) => IVcAutoRecruitSettingsRepository =
  createRepositoryGetter<IVcAutoRecruitSettingsRepository>(
    "VcAutoRecruitSettingsRepository",
    (prisma) => new VcAutoRecruitSettingsRepository(prisma),
  );
