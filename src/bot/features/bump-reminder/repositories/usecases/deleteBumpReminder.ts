// src/bot/features/bump-reminder/repositories/usecases/deleteBumpReminder.ts
// Bumpリマインダー削除ユースケース

import type { PrismaClient } from "@prisma/client";

/**
 * 指定IDのBumpリマインダーを削除する
 * @param prisma Prismaクライアント
 * @param id 削除対象リマインダーID
 * @returns 実行完了
 */
export async function deleteBumpReminderUseCase(
  prisma: PrismaClient,
  id: string,
): Promise<void> {
  await prisma.bumpReminder.delete({
    where: { id },
  });
}
