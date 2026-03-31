// src/shared/database/repositories/persistence/guildConfigWritePersistence.ts
// guildConfig の write 系永続化ヘルパー

import type { PrismaClient } from "@prisma/client";

/**
 * guildConfig レコードを新規作成する
 * @param prisma Prismaクライアント
 * @param data 作成データ
 * @returns 実行完了
 */
export async function createGuildConfigRecord(
  prisma: PrismaClient,
  data: {
    guildId: string;
    locale: string;
  },
): Promise<void> {
  await prisma.guildConfig.create({ data });
}

/**
 * guildConfig レコードを upsert で更新/作成する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @param updateData 更新データ
 * @param createData 作成データ
 * @returns 実行完了
 */
export async function upsertGuildConfigRecord(
  prisma: PrismaClient,
  guildId: string,
  updateData: Record<string, unknown>,
  createData: {
    guildId: string;
    locale: string;
  } & Record<string, unknown>,
): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: updateData,
    create: createData,
  });
}

/**
 * guildConfig レコードを削除する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns 実行完了
 */
export async function deleteGuildConfigRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<void> {
  await prisma.guildConfig.delete({
    where: { guildId },
  });
}
