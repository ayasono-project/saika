// ギルド親レコードの登録リポジトリ（guilds テーブル）

import type { PrismaClient } from "@prisma/client";
import type { IGuildRegistryRepository } from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guilds テーブルへギルドの親レコードを登録するリポジトリ
 *
 * 全機能テーブルが guilds へ FK を張っているため、**親行が無いギルドでは
 * どの機能の設定も保存できない**（FK 違反で落ちる）。参加時（guildCreate）と
 * 照合（起動時・再接続時・日次）の2経路からここを呼び、親行が存在する状態を保つ。
 * 切断中に導入されたギルドは guildCreate が飛ばないため、再接続時の照合までの
 * 数秒間だけ親行が欠ける。
 */
export class GuildRegistryRepository implements IGuildRegistryRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async ensureGuild(guildId: string): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      create: { guildId },
      // 既存行には触らない。再参加のたびに joinedAt を上書きすると
      // 「いつから導入されているか」が失われる
      update: {},
    });
  }

  async ensureGuilds(guildIds: string[]): Promise<void> {
    // createMany は空配列でもクエリを投げるため、呼ばずに済ませる
    if (guildIds.length === 0) return;

    await this.prisma.guild.createMany({
      data: guildIds.map((guildId) => ({ guildId })),
      skipDuplicates: true,
    });
  }

  async scheduleDeletion(guildId: string, deleteAt: Date): Promise<void> {
    // update ではなく updateMany を使う。親行が無いギルドはデータも持てない
    // （FK があるため）ので削除予約は不要で、P2025 を投げる必要がない
    await this.prisma.guild.updateMany({
      where: { guildId },
      data: { scheduledDeletionAt: deleteAt },
    });
  }

  async cancelScheduledDeletion(guildId: string): Promise<void> {
    await this.prisma.guild.updateMany({
      where: { guildId },
      data: { scheduledDeletionAt: null },
    });
  }

  async cancelScheduledDeletions(guildIds: string[]): Promise<number> {
    if (guildIds.length === 0) return 0;

    // 予約が入っている行だけを対象にし、件数がそのまま「救済した数」になるようにする
    const result = await this.prisma.guild.updateMany({
      where: { guildId: { in: guildIds }, scheduledDeletionAt: { not: null } },
      data: { scheduledDeletionAt: null },
    });
    return result.count;
  }

  async scheduleDeletionForAbsentGuilds(
    joinedGuildIds: string[],
    deleteAt: Date,
  ): Promise<number> {
    // 予約済みの行は条件で外す。上書きすると照合のたびに期限が延び、永久に消えない
    const result = await this.prisma.guild.updateMany({
      where: {
        guildId: { notIn: joinedGuildIds },
        scheduledDeletionAt: null,
      },
      data: { scheduledDeletionAt: deleteAt },
    });
    return result.count;
  }

  async findGuildsDueForDeletion(now: Date): Promise<string[]> {
    const rows = await this.prisma.guild.findMany({
      where: { scheduledDeletionAt: { lte: now } },
      select: { guildId: true },
    });
    return rows.map((row) => row.guildId);
  }

  async deleteGuildsDueForDeletion(
    guildIds: string[],
    now: Date,
  ): Promise<number> {
    if (guildIds.length === 0) return 0;

    // 列挙と削除の間に再導入された（予約が消えた）ギルドを消さないよう、
    // 削除側でも期限の条件を再評価する
    const result = await this.prisma.guild.deleteMany({
      where: {
        guildId: { in: guildIds },
        scheduledDeletionAt: { lte: now },
      },
    });
    return result.count;
  }
}

/**
 * ギルド親レコード登録リポジトリのシングルトンを取得する
 */
export const getGuildRegistryRepository: (
  prisma?: PrismaClient,
) => IGuildRegistryRepository =
  createRepositoryGetter<IGuildRegistryRepository>(
    "GuildRegistryRepository",
    (prisma) => new GuildRegistryRepository(prisma),
  );
