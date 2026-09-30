// guildSettings の write 系永続化ヘルパー

import type { PrismaClient } from "@prisma/client";

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
