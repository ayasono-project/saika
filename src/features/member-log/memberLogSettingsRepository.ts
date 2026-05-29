// src/shared/database/repositories/memberLogSettingsRepository.ts
// メンバーログ設定リポジトリ（guild_member_log_configs テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  IMemberLogSettingsRepository,
  MemberLogSettings,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_member_log_configs テーブルを使用したメンバーログ設定リポジトリ
 */
export class MemberLogSettingsRepository
  implements IMemberLogSettingsRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getMemberLogSettings(
    guildId: string,
  ): Promise<MemberLogSettings | null> {
    const record = await this.prisma.guildMemberLogSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return {
      enabled: record.enabled,
      channelId: record.channelId ?? undefined,
      joinMessage: record.joinMessage ?? undefined,
      leaveMessage: record.leaveMessage ?? undefined,
    };
  }

  async updateMemberLogSettings(
    guildId: string,
    memberLogSettings: MemberLogSettings,
  ): Promise<void> {
    await this.prisma.guildMemberLogSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: memberLogSettings.enabled,
        channelId: memberLogSettings.channelId ?? null,
        joinMessage: memberLogSettings.joinMessage ?? null,
        leaveMessage: memberLogSettings.leaveMessage ?? null,
      },
      update: {
        enabled: memberLogSettings.enabled,
        channelId: memberLogSettings.channelId ?? null,
        joinMessage: memberLogSettings.joinMessage ?? null,
        leaveMessage: memberLogSettings.leaveMessage ?? null,
      },
    });
  }
}

/**
 * メンバーログ設定リポジトリのシングルトンを取得する
 */
export const getMemberLogSettingsRepository: (
  prisma?: PrismaClient,
) => IMemberLogSettingsRepository =
  createRepositoryGetter<IMemberLogSettingsRepository>(
    "MemberLogSettingsRepository",
    (prisma) => new MemberLogSettingsRepository(prisma),
  );
