// src/bot/features/bump-reminder/repositories/usecases/findPendingReminders.ts
// pending Bumpリマインダー取得ユースケース

import type { PrismaClient } from "@prisma/client";
import { BUMP_REMINDER_STATUS } from "../../constants/bumpReminderConstants";
import type { BumpReminder } from "../types";

/**
 * ギルド+サービス単位で次回実行予定のpendingリマインダーを1件取得する
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @param serviceName 対象サービス名
 * @returns pendingリマインダー（未存在時はnull）
 */
export async function findPendingByGuildAndServiceUseCase(
  prisma: PrismaClient,
  guildId: string,
  serviceName: string,
): Promise<BumpReminder | null> {
  const result = await prisma.bumpReminder.findFirst({
    where: {
      guildId,
      serviceName,
      status: BUMP_REMINDER_STATUS.PENDING,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return result as BumpReminder | null;
}

/**
 * 全ギルドのpendingリマインダーを実行時刻昇順で取得する
 * @param prisma Prismaクライアント
 * @returns pendingリマインダー一覧
 */
export async function findAllPendingUseCase(
  prisma: PrismaClient,
): Promise<BumpReminder[]> {
  const results = await prisma.bumpReminder.findMany({
    where: {
      status: BUMP_REMINDER_STATUS.PENDING,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return results as BumpReminder[];
}
