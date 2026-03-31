// src/bot/features/bump-reminder/repositories/usecases/findBumpReminderById.ts
// Bumpリマインダー単体取得ユースケース

import type { PrismaClient } from "@prisma/client";
import type { BumpReminder } from "../types";

/**
 * 指定IDのBumpリマインダーを取得する
 * @param prisma Prismaクライアント
 * @param id 取得対象リマインダーID
 * @returns リマインダー（未存在時はnull）
 */
export async function findBumpReminderByIdUseCase(
  prisma: PrismaClient,
  id: string,
): Promise<BumpReminder | null> {
  const result = await prisma.bumpReminder.findUnique({
    where: { id },
  });

  return result as BumpReminder | null;
}
