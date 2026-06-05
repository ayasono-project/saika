// src/features/unverified-kick/unverifiedKickWarnRepository.ts
// 未承認ユーザー自動キックの事前警告記録リポジトリ（guild_unverified_kick_warns テーブル）

import type { PrismaClient } from "@prisma/client";
import type { IUnverifiedKickWarnRepository } from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guild_unverified_kick_warns テーブルを使用した事前警告記録リポジトリ。
 * warnedAt をもとに「警告済みか」「通知猶予が経過したか」を日次チェックで判定する。
 */
export class UnverifiedKickWarnRepository
  implements IUnverifiedKickWarnRepository
{
  private readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getWarnedMap(guildId: string): Promise<Map<string, Date>> {
    const records = await this.prisma.guildUnverifiedKickWarn.findMany({
      where: { guildId },
      select: { userId: true, warnedAt: true },
    });
    return new Map(records.map((r) => [r.userId, r.warnedAt]));
  }

  async recordWarned(
    guildId: string,
    userIds: string[],
    warnedAt: Date,
  ): Promise<void> {
    if (userIds.length === 0) return;
    // 警告対象は未警告者のみのため新規挿入。多重実行に備え skipDuplicates で冪等化
    // （既存 warnedAt は据え置き＝最初の警告時刻を保持）。
    await this.prisma.guildUnverifiedKickWarn.createMany({
      data: userIds.map((userId) => ({ guildId, userId, warnedAt })),
      skipDuplicates: true,
    });
  }

  async deleteWarned(guildId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    await this.prisma.guildUnverifiedKickWarn.deleteMany({
      where: { guildId, userId: { in: userIds } },
    });
  }

  async deleteAllByGuild(guildId: string): Promise<void> {
    await this.prisma.guildUnverifiedKickWarn.deleteMany({
      where: { guildId },
    });
  }
}

/**
 * 事前警告記録リポジトリのシングルトンを取得する
 */
export const getUnverifiedKickWarnRepository: (
  prisma?: PrismaClient,
) => IUnverifiedKickWarnRepository =
  createRepositoryGetter<IUnverifiedKickWarnRepository>(
    "UnverifiedKickWarnRepository",
    (prisma) => new UnverifiedKickWarnRepository(prisma),
  );
