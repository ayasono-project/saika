// src/bot/features/bump-reminder/repositories/usecases/cleanupBumpReminders.ts
// Bumpリマインダーの期限超過データ削除ユースケース

import type { PrismaClient } from "@prisma/client";
import { BUMP_REMINDER_STATUS } from "../../constants/bumpReminderConstants";

/**
 * 指定日数より古い送信済み/キャンセル済みリマインダーを削除する
 * @param prisma Prismaクライアント
 * @param daysOld 削除基準の日数
 * @returns 削除件数
 */
export async function cleanupOldBumpRemindersUseCase(
  prisma: PrismaClient,
  daysOld: number,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.bumpReminder.deleteMany({
    where: {
      status: {
        in: [BUMP_REMINDER_STATUS.SENT, BUMP_REMINDER_STATUS.CANCELLED],
      },
      updatedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
