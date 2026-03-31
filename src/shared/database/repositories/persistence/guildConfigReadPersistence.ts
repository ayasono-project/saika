// src/shared/database/repositories/persistence/guildConfigReadPersistence.ts
// guildConfig の read 系永続化ヘルパー

import type { GuildConfig, PrismaClient } from "@prisma/client";

/**
 * guildConfig レコードを1件取得する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns guildConfig レコード
 */
export async function findGuildConfigRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<GuildConfig | null> {
  return prisma.guildConfig.findUnique({
    where: { guildId },
  });
}

/**
 * guildConfig レコードの存在有無を返す
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns 存在する場合 true
 */
export async function existsGuildConfigRecord(
  prisma: PrismaClient,
  guildId: string,
): Promise<boolean> {
  const record = await prisma.guildConfig.findUnique({
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
  const record = await prisma.guildConfig.findUnique({
    where: { guildId },
    select: { locale: true },
  });
  return record?.locale ?? null;
}
