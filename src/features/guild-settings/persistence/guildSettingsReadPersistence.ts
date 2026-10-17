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
