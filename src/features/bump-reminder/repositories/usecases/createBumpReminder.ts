// src/bot/features/bump-reminder/repositories/usecases/createBumpReminder.ts
// Bumpリマインダー作成ユースケース

import type { PrismaClient } from "@prisma/client";
import { BUMP_REMINDER_STATUS } from "../../constants/bumpReminderConstants";
import type { BumpReminder } from "../types";

/**
 * 新規Bumpリマインダーを作成し、既存pendingをキャンセルする
 * @param prisma Prismaクライアント
 * @param guildId 対象ギルドID
 * @param channelId 対象チャンネルID
 * @param scheduledAt リマインド予定時刻
 * @param messageId 元メッセージID
 * @param panelMessageId パネルメッセージID
 * @param serviceName 検知サービス名
 * @returns 作成したリマインダー
 */
export async function createBumpReminderUseCase(
  prisma: PrismaClient,
  guildId: string,
  channelId: string,
  scheduledAt: Date,
  messageId?: string,
  panelMessageId?: string,
  serviceName?: string,
): Promise<BumpReminder> {
  const reminder = await prisma.$transaction(async (tx) => {
    // 同一 guildId + 同一 serviceName の pending のみキャンセル
    // serviceName が異なるサービス（Disboard/Dissoku）のリマインダーに影響しないよう絞り込む
    await tx.bumpReminder.updateMany({
      where: {
        guildId,
        status: BUMP_REMINDER_STATUS.PENDING,
        serviceName: serviceName ?? null,
      },
      data: { status: BUMP_REMINDER_STATUS.CANCELLED },
    });

    return tx.bumpReminder.create({
      data: {
        guildId,
        channelId,
        messageId,
        panelMessageId,
        serviceName,
        scheduledAt,
        status: BUMP_REMINDER_STATUS.PENDING,
      },
    });
  });

  return reminder as BumpReminder;
}
