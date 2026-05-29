// src/shared/database/repositories/persistence/guildSettingsReadPersistence.ts
// guildSettings の read 系永続化ヘルパー

import type { GuildSettings, PrismaClient } from "@prisma/client";

/**
 * guildSettings レコードを1件取得する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns guildSettings レコード
 */
export async function findGuildSettingsRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<GuildSettings | null> {
  return prisma.guildSettings.findUnique({
    where: { guildId },
  });
}

/**
 * guildSettings レコードの存在有無を返す
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns 存在する場合 true
 */
export async function existsGuildSettingsRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<boolean> {
  const record = await prisma.guildSettings.findUnique({
    where: { guildId },
    select: { id: true },
  });
  return record !== null;
}

/**
 * guild の locale を取得する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns locale（未設定時はnull）
 */
export async function findGuildLocale(
  prisma: PrismaClient,
  guildId: string,
): Promise<string | null> {
  const record = await prisma.guildSettings.findUnique({
    where: { guildId },
    select: { locale: true },
  });
  return record?.locale ?? null;
}
