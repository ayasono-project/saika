// src/features/unverified-kick/unverifiedKickSettingsRepository.ts
// 未承認ユーザー自動キック設定リポジトリ（guild_unverified_kick_settings テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  IUnverifiedKickSettingsRepository,
  UnverifiedKickSettings,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_unverified_kick_settings テーブルを使用した未承認ユーザー自動キック設定リポジトリ
 */
export class UnverifiedKickSettingsRepository
  implements IUnverifiedKickSettingsRepository
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
    verifiedRoleId: string | null;
    graceDays: number;
    warnDays: number | null;
    notifyChannelId: string | null;
    logChannelId: string | null;
    markerRoleId: string | null;
    dmTemplate: string | null;
    notifyTemplate: string | null;
    exemptRoleIds: unknown;
    timezone: string;
    runHour: number;
    lastRunDate: string | null;
    mentionEnabled: boolean;
  }): UnverifiedKickSettings {
    return {
      enabled: record.enabled,
      enabledAt: record.enabledAt ?? undefined,
      verifiedRoleId: record.verifiedRoleId ?? undefined,
      graceDays: record.graceDays,
      warnDays: record.warnDays ?? undefined,
      notifyChannelId: record.notifyChannelId ?? undefined,
      logChannelId: record.logChannelId ?? undefined,
      markerRoleId: record.markerRoleId ?? undefined,
      dmTemplate: record.dmTemplate ?? undefined,
      notifyTemplate: record.notifyTemplate ?? undefined,
      exemptRoleIds: record.exemptRoleIds as string[],
      timezone: record.timezone,
      runHour: record.runHour,
      lastRunDate: record.lastRunDate ?? undefined,
      mentionEnabled: record.mentionEnabled,
    };
  }

  async getUnverifiedKickSettings(
    guildId: string,
  ): Promise<UnverifiedKickSettings | null> {
    const record = await this.prisma.guildUnverifiedKickSettings.findUnique({
      where: { guildId },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async updateUnverifiedKickSettings(
    guildId: string,
    settings: UnverifiedKickSettings,
  ): Promise<void> {
    const data = {
      enabled: settings.enabled,
      enabledAt: settings.enabledAt ?? null,
      verifiedRoleId: settings.verifiedRoleId ?? null,
      graceDays: settings.graceDays,
      warnDays: settings.warnDays ?? null,
      notifyChannelId: settings.notifyChannelId ?? null,
      logChannelId: settings.logChannelId ?? null,
      markerRoleId: settings.markerRoleId ?? null,
      dmTemplate: settings.dmTemplate ?? null,
      notifyTemplate: settings.notifyTemplate ?? null,
      exemptRoleIds: settings.exemptRoleIds,
      timezone: settings.timezone,
      runHour: settings.runHour,
      lastRunDate: settings.lastRunDate ?? null,
      mentionEnabled: settings.mentionEnabled,
    };
    await this.prisma.guildUnverifiedKickSettings.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
  }

  async updateLastRunDate(guildId: string, date: string): Promise<void> {
    await this.prisma.guildUnverifiedKickSettings.updateMany({
      where: { guildId },
      data: { lastRunDate: date },
    });
  }

  async getAllEnabled(): Promise<
    Array<UnverifiedKickSettings & { guildId: string }>
  > {
    const records = await this.prisma.guildUnverifiedKickSettings.findMany({
      where: { enabled: true },
    });
    return records.map((record) => ({
      guildId: record.guildId,
      ...this.toDomain(record),
    }));
  }

  async deleteUnverifiedKickSettings(guildId: string): Promise<void> {
    await this.prisma.guildUnverifiedKickSettings.deleteMany({
      where: { guildId },
    });
  }
}

/**
 * 未承認ユーザー自動キック設定リポジトリのシングルトンを取得する
 */
export const getUnverifiedKickSettingsRepository: (
  prisma?: PrismaClient,
) => IUnverifiedKickSettingsRepository =
  createRepositoryGetter<IUnverifiedKickSettingsRepository>(
    "UnverifiedKickSettingsRepository",
    (prisma) => new UnverifiedKickSettingsRepository(prisma),
  );
