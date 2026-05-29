// src/shared/database/repositories/persistence/guildSettingsWritePersistence.ts
// guildSettings の write 系永続化ヘルパー

import type { PrismaClient } from "@prisma/client";

/**
 * guildSettings レコードを新規作成する
 * @param prisma Prismaクライアント
 * @param data 作成データ
 * @returns 実行完了
 */
export async function createGuildSettingsRecord(
  prisma: PrismaClient,
  data: {
    guildId: string;
    locale: string;
  },
): Promise<void> {
  await prisma.guildSettings.create({ data });
}

/**
 * guildSettings レコードを upsert で更新/作成する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @param updateData 更新データ
 * @param createData 作成データ
 * @returns 実行完了
 */
export async function upsertGuildSettingsRecord(
  prisma: PrismaClient,
  guildId: string,
  updateData: Record<string, unknown>,
  createData: {
    guildId: string;
    locale: string;
  } & Record<string, unknown>,
): Promise<void> {
  await prisma.guildSettings.upsert({
    where: { guildId },
    update: updateData,
    create: createData,
  });
}

/**
 * guildSettings レコードを削除する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns 実行完了
 */
export async function deleteGuildSettingsRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<void> {
  await prisma.guildSettings.delete({
    where: { guildId },
  });
}
