// src/features/inactive-kick/inactiveKickSettingsRepository.ts
// 非アクティブ自動キック設定リポジトリ（guild_inactive_kick_settings テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  IInactiveKickSettingsRepository,
  InactiveKickSettings,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_inactive_kick_settings テーブルを使用した非アクティブ自動キック設定リポジトリ
 */
export class InactiveKickSettingsRepository
  implements IInactiveKickSettingsRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Prisma レコードをドメイン型へ変換する
   */
  private toDomain(record: {
    enabled: boolean;
    enabledAt: Date | null;
    channelId: string | null;
    thresholdDays: number;
    weekWarnMessage: string | null;
    finalWarnMessage: string | null;
    kickMessage: string | null;
    markerRoleId: string | null;
    whitelistRoleIds: unknown;
    whitelistUserIds: unknown;
    timezone: string;
    runHour: number;
    lastRunDate: string | null;
    mentionEnabled: boolean;
  }): InactiveKickSettings {
    return {
      enabled: record.enabled,
      enabledAt: record.enabledAt ?? undefined,
      channelId: record.channelId ?? undefined,
      thresholdDays: record.thresholdDays,
      weekWarnMessage: record.weekWarnMessage ?? undefined,
      finalWarnMessage: record.finalWarnMessage ?? undefined,
      kickMessage: record.kickMessage ?? undefined,
      markerRoleId: record.markerRoleId ?? undefined,
      whitelistRoleIds: record.whitelistRoleIds as string[],
      whitelistUserIds: record.whitelistUserIds as string[],
      timezone: record.timezone,
      runHour: record.runHour,
      lastRunDate: record.lastRunDate ?? undefined,
      mentionEnabled: record.mentionEnabled,
    };
  }

  async getInactiveKickSettings(
    guildId: string,
  ): Promise<InactiveKickSettings | null> {
    const record = await this.prisma.guildInactiveKickSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async updateInactiveKickSettings(
    guildId: string,
    settings: InactiveKickSettings,
  ): Promise<void> {
    const data = {
      enabled: settings.enabled,
      enabledAt: settings.enabledAt ?? null,
      channelId: settings.channelId ?? null,
      thresholdDays: settings.thresholdDays,
      weekWarnMessage: settings.weekWarnMessage ?? null,
      finalWarnMessage: settings.finalWarnMessage ?? null,
      kickMessage: settings.kickMessage ?? null,
      markerRoleId: settings.markerRoleId ?? null,
      whitelistRoleIds: settings.whitelistRoleIds,
      whitelistUserIds: settings.whitelistUserIds,
      timezone: settings.timezone,
      runHour: settings.runHour,
      lastRunDate: settings.lastRunDate ?? null,
      mentionEnabled: settings.mentionEnabled,
    };
    await this.prisma.guildInactiveKickSettings.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
  }

  async updateLastRunDate(guildId: string, date: string): Promise<void> {
    await this.prisma.guildInactiveKickSettings.updateMany({
      where: { guildId },
      data: { lastRunDate: date },
    });
  }

  async getAllEnabled(): Promise<
    Array<InactiveKickSettings & { guildId: string }>
  > {
    const records = await this.prisma.guildInactiveKickSettings.findMany({
      where: { enabled: true },
    });
    return records.map((record) => ({
      guildId: record.guildId,
      ...this.toDomain(record),
    }));
  }

  async deleteInactiveKickSettings(guildId: string): Promise<void> {
    await this.prisma.guildInactiveKickSettings.deleteMany({
      where: { guildId },
    });
  }
}

/**
 * 非アクティブ自動キック設定リポジトリのシングルトンを取得する
 */
export const getInactiveKickSettingsRepository: (
  prisma?: PrismaClient,
) => IInactiveKickSettingsRepository =
  createRepositoryGetter<IInactiveKickSettingsRepository>(
    "InactiveKickSettingsRepository",
    (prisma) => new InactiveKickSettingsRepository(prisma),
  );
