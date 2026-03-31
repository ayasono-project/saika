// src/shared/database/repositories/guildConfigAggregateRepository.ts
// ギルド設定一括操作リポジトリ（エクスポート/インポート/reset-all）

import type { PrismaClient } from "@prisma/client";
import type {
  FullGuildConfig,
  IAfkConfigRepository,
  IBumpReminderConfigRepository,
  IGuildConfigAggregateRepository,
  IGuildCoreRepository,
  IMemberLogConfigRepository,
  IVacConfigRepository,
  IVcRecruitConfigRepository,
} from "../types";

/**
 * 全機能設定の一括取得・インポート・削除を担当するリポジトリ
 * 各スタンドアロンリポジトリを集約して横断操作を提供する
 */
export class GuildConfigAggregateRepository
  implements IGuildConfigAggregateRepository
{
  private readonly coreRepo: IGuildCoreRepository;
  private readonly afkRepo: IAfkConfigRepository;
  private readonly bumpReminderRepo: IBumpReminderConfigRepository;
  private readonly vacRepo: IVacConfigRepository;
  private readonly memberLogRepo: IMemberLogConfigRepository;
  private readonly vcRecruitRepo: IVcRecruitConfigRepository;
  private readonly prisma: PrismaClient;

  constructor(
    coreRepo: IGuildCoreRepository,
    afkRepo: IAfkConfigRepository,
    bumpReminderRepo: IBumpReminderConfigRepository,
    vacRepo: IVacConfigRepository,
    memberLogRepo: IMemberLogConfigRepository,
    vcRecruitRepo: IVcRecruitConfigRepository,
    prisma: PrismaClient,
  ) {
    this.coreRepo = coreRepo;
    this.afkRepo = afkRepo;
    this.bumpReminderRepo = bumpReminderRepo;
    this.vacRepo = vacRepo;
    this.memberLogRepo = memberLogRepo;
    this.vcRecruitRepo = vcRecruitRepo;
    this.prisma = prisma;
  }

  /**
   * エクスポート用に全機能の設定を一括取得する
   */
  async getFullConfig(guildId: string): Promise<FullGuildConfig | null> {
    const config = await this.coreRepo.getConfig(guildId);
    if (!config) return null;

    const [afk, bumpReminder, vac, memberLog, vcRecruit] = await Promise.all([
      this.afkRepo.getAfkConfig(guildId),
      this.bumpReminderRepo.getBumpReminderConfig(guildId),
      this.vacRepo.getVacConfig(guildId),
      this.memberLogRepo.getMemberLogConfig(guildId),
      this.vcRecruitRepo.getVcRecruitConfig(guildId),
    ]);

    const result: FullGuildConfig = {
      locale: config.locale,
      errorChannelId: config.errorChannelId,
    };

    if (afk) result.afk = afk;
    if (bumpReminder) result.bumpReminder = bumpReminder;
    // VAC は triggerChannelIds のみエクスポート（createdChannels はランタイムデータ）
    if (vac)
      result.vac = {
        enabled: vac.enabled,
        triggerChannelIds: vac.triggerChannelIds,
      };
    if (memberLog) result.memberLog = memberLog;
    if (vcRecruit) result.vcRecruit = vcRecruit;

    return result;
  }

  /**
   * インポートデータから全機能の設定を一括上書き保存する
   */
  async importFullConfig(
    guildId: string,
    data: FullGuildConfig,
  ): Promise<void> {
    await this.coreRepo.updateConfig(guildId, {
      locale: data.locale,
      errorChannelId: data.errorChannelId,
    });

    const operations: Promise<void>[] = [];

    if (data.afk) {
      operations.push(this.afkRepo.updateAfkConfig(guildId, data.afk));
    }
    if (data.bumpReminder) {
      operations.push(
        this.bumpReminderRepo.updateBumpReminderConfig(
          guildId,
          data.bumpReminder,
        ),
      );
    }
    if (data.vac) {
      operations.push(
        this.vacRepo.updateVacConfig(guildId, {
          enabled: data.vac.enabled,
          triggerChannelIds: data.vac.triggerChannelIds,
          createdChannels: [],
        }),
      );
    }
    if (data.memberLog) {
      operations.push(
        this.memberLogRepo.updateMemberLogConfig(guildId, data.memberLog),
      );
    }
    if (data.vcRecruit) {
      operations.push(
        this.vcRecruitRepo.updateVcRecruitConfig(guildId, data.vcRecruit),
      );
    }

    await Promise.all(operations);
  }

  /**
   * ギルド設定と全機能設定を一括削除する（reset-all 用）
   * トランザクションで一括実行し、中途半端な削除状態を防止する
   */
  async deleteAllConfigs(guildId: string): Promise<void> {
    // deleteMany は該当レコードなしでも例外を投げないため、個別エラー処理不要
    await this.prisma.$transaction([
      this.prisma.ticket.deleteMany({ where: { guildId } }),
      this.prisma.guildTicketConfig.deleteMany({ where: { guildId } }),
      this.prisma.stickyMessage.deleteMany({ where: { guildId } }),
      this.prisma.guildBumpReminderConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildAfkConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildVacConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildMemberLogConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildVcRecruitConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildConfig.deleteMany({ where: { guildId } }),
    ]);
  }
}
