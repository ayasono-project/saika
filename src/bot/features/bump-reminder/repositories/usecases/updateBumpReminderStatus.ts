// src/bot/features/bump-reminder/repositories/usecases/updateBumpReminderStatus.ts
// Bumpリマインダー状態更新ユースケース

import type { PrismaClient } from "@prisma/client";
import {
  BUMP_REMINDER_STATUS,
  type BumpReminderStatus,
} from "../../constants/bumpReminderConstants";

/**
 * 指定リマインダーの状態を更新する
 * @param prisma Prismaクライアント
 * @param id 対象リマインダーID
 * @param status 更新後ステータス
 * @returns 実行完了
 */
export async function updateReminderStatusUseCase(
  prisma: PrismaClient,
  id: string,
  status: BumpReminderStatus,
): Promise<void> {
  await prisma.bumpReminder.update({
    where: { id },
    data: { status },
  });
}

/**
 * 指定ギルドのpendingリマインダーを一括キャンセルする
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @returns 実行完了
 */
export async function cancelPendingByGuildUseCase(
  prisma: PrismaClient,
  guildId: string,
): Promise<void> {
  await prisma.bumpReminder.updateMany({
    where: {
      guildId,
      status: BUMP_REMINDER_STATUS.PENDING,
    },
    data: {
      status: BUMP_REMINDER_STATUS.CANCELLED,
    },
  });
}

/**
 * 指定ギルド・チャンネルのpendingリマインダーを一括キャンセルする
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @param channelId 対象チャンネルID
 * @returns 実行完了
 */
export async function cancelPendingByGuildAndChannelUseCase(
  prisma: PrismaClient,
  guildId: string,
  channelId: string,
): Promise<void> {
  await prisma.bumpReminder.updateMany({
    where: {
      guildId,
      channelId,
      status: BUMP_REMINDER_STATUS.PENDING,
    },
    data: {
      status: BUMP_REMINDER_STATUS.CANCELLED,
    },
  });
}
