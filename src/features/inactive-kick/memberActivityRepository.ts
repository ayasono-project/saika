// src/features/inactive-kick/memberActivityRepository.ts
// メンバー活動履歴リポジトリ（member_activities テーブル）

import type { PrismaClient } from "@prisma/client";
import type {
  IMemberActivityRepository,
  MemberActivity,
} from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * member_activities テーブルを使用したメンバー活動履歴リポジトリ
 */
export class MemberActivityRepository implements IMemberActivityRepository {
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async recordActivity(
    guildId: string,
    userId: string,
    lastActivityAt: Date,
    warnStage?: number,
  ): Promise<void> {
    // warnStage は指定時のみ更新する（活動記録は基本 lastActivityAt のみ更新）
    await this.prisma.memberActivity.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: {
        guildId,
        userId,
        lastActivityAt,
        warnStage: warnStage ?? 0,
      },
      update: {
        lastActivityAt,
        ...(warnStage !== undefined ? { warnStage } : {}),
      },
    });
  }

  async setWarnStage(
    guildId: string,
    userId: string,
    warnStage: number,
  ): Promise<void> {
    await this.prisma.memberActivity.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, warnStage, lastActivityAt: new Date(0) },
      update: { warnStage },
    });
  }

  async getActivity(
    guildId: string,
    userId: string,
  ): Promise<MemberActivity | null> {
    const record = await this.prisma.memberActivity.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });
    if (!record) return null;
    return {
      guildId: record.guildId,
      userId: record.userId,
      lastActivityAt: record.lastActivityAt,
      warnStage: record.warnStage,
    };
  }

  async findByGuild(guildId: string): Promise<MemberActivity[]> {
    const records = await this.prisma.memberActivity.findMany({
      where: { guildId },
    });
    return records.map((record) => ({
      guildId: record.guildId,
      userId: record.userId,
      lastActivityAt: record.lastActivityAt,
      warnStage: record.warnStage,
    }));
  }

  async deleteActivity(guildId: string, userId: string): Promise<void> {
    await this.prisma.memberActivity.deleteMany({
      where: { guildId, userId },
    });
  }

  async deleteByGuild(guildId: string): Promise<void> {
    await this.prisma.memberActivity.deleteMany({ where: { guildId } });
  }
}

/**
 * メンバー活動履歴リポジトリのシングルトンを取得する
 */
export const getMemberActivityRepository: (
  prisma?: PrismaClient,
) => IMemberActivityRepository =
  createRepositoryGetter<IMemberActivityRepository>(
    "MemberActivityRepository",
    (prisma) => new MemberActivityRepository(prisma),
  );
