// src/bot/features/bump-reminder/repositories/bumpReminderRepository.ts
// Bumpリマインダー用リポジトリ

import type { PrismaClient } from "@prisma/client";
import { tDefault } from "../../../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../../../shared/utils/errorHandling";
import { logger } from "../../../../shared/utils/logger";
import { type BumpReminderStatus } from "../constants/bumpReminderConstants";
import type { BumpReminder, IBumpReminderRepository } from "./types";
import { cleanupOldBumpRemindersUseCase } from "./usecases/cleanupBumpReminders";
import { createBumpReminderUseCase } from "./usecases/createBumpReminder";
import { deleteBumpReminderUseCase } from "./usecases/deleteBumpReminder";
import { findBumpReminderByIdUseCase } from "./usecases/findBumpReminderById";
import {
  findAllPendingUseCase,
  findPendingByGuildAndServiceUseCase,
} from "./usecases/findPendingReminders";
import {
  cancelPendingByGuildAndChannelUseCase,
  cancelPendingByGuildUseCase,
  updateReminderStatusUseCase,
} from "./usecases/updateBumpReminderStatus";

/**
 * Prisma実装
 */
export class BumpReminderRepository implements IBumpReminderRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 新しいリマインダーを作成
   * 既存pendingのキャンセルと新規作成をトランザクションで原子的に実行し、競合状態を防ぐ
   * @param guildId 登録対象のギルドID
   * @param channelId 通知先チャンネルID
   * @param scheduledAt 実行予定時刻
   * @param messageId 元メッセージID
   * @param panelMessageId パネルメッセージID
   * @param serviceName サービス名
   * @returns 作成したリマインダー
   */
  async create(
    guildId: string,
    channelId: string,
    scheduledAt: Date,
    messageId?: string,
    panelMessageId?: string,
    serviceName?: string,
  ): Promise<BumpReminder> {
    return executeWithDatabaseError(
      async () => {
        const reminder = await createBumpReminderUseCase(
          this.prisma,
          guildId,
          channelId,
          scheduledAt,
          messageId,
          panelMessageId,
          serviceName,
        );

        logger.debug(
          tDefault("bumpReminder:log.database_created", {
            id: reminder.id,
            guildId,
          }),
        );

        return reminder as BumpReminder;
      },
      tDefault("bumpReminder:log.database_create_failed", {
        guildId,
      }),
    );
  }

  /**
   * IDでリマインダーを取得
   * @param id 取得対象リマインダーID
   * @returns 該当リマインダー（未存在時は null）
   */
  async findById(id: string): Promise<BumpReminder | null> {
    return executeWithDatabaseError(
      async () => {
        return findBumpReminderByIdUseCase(this.prisma, id);
      },
      tDefault("bumpReminder:log.database_find_failed", { id }),
    );
  }

  /**
   * ギルド+サービスのpendingリマインダーを取得（1つのみ）
   * @param guildId 取得対象のギルドID
   * @param serviceName 取得対象のサービス名
   * @returns pending リマインダー（未存在時は null）
   */
  async findPendingByGuildAndService(
    guildId: string,
    serviceName: string,
  ): Promise<BumpReminder | null> {
    return executeWithDatabaseError(
      async () => {
        return findPendingByGuildAndServiceUseCase(
          this.prisma,
          guildId,
          serviceName,
        );
      },
      tDefault("bumpReminder:log.database_find_failed", { guildId }),
    );
  }

  /**
   * すべてのpendingリマインダーを取得
   * @returns pending リマインダー一覧
   */
  async findAllPending(): Promise<BumpReminder[]> {
    return executeWithDatabaseError(async () => {
      const results = await findAllPendingUseCase(this.prisma);
      // 復元処理側で順次再登録しやすいよう昇順で返す
      return results as BumpReminder[];
    }, tDefault("bumpReminder:log.database_find_all_failed"));
  }

  /**
   * ステータスを更新
   * @param id 更新対象リマインダーID
   * @param status 更新後ステータス
   * @returns 実行完了を示す Promise
   */
  async updateStatus(id: string, status: BumpReminderStatus): Promise<void> {
    await executeWithDatabaseError(
      async () => {
        await updateReminderStatusUseCase(this.prisma, id, status);

        logger.debug(
          tDefault("bumpReminder:log.database_status_updated", {
            id,
            status,
          }),
        );
      },
      tDefault("bumpReminder:log.database_update_failed", { id }),
    );
  }

  /**
   * リマインダーを削除
   * @param id 削除対象リマインダーID
   * @returns 実行完了を示す Promise
   */
  async delete(id: string): Promise<void> {
    await executeWithDatabaseError(
      async () => {
        await deleteBumpReminderUseCase(this.prisma, id);
        // 物理削除は履歴保持不要な最終状態でのみ実行される想定

        logger.debug(tDefault("bumpReminder:log.database_deleted", { id }));
      },
      tDefault("bumpReminder:log.database_delete_failed", { id }),
    );
  }

  /**
   * ギルドのpendingリマインダーをすべてキャンセル
   * @param guildId キャンセル対象のギルドID
   * @returns 実行完了を示す Promise
   */
  async cancelByGuild(guildId: string): Promise<void> {
    await executeWithDatabaseError(
      async () => {
        await cancelPendingByGuildUseCase(this.prisma, guildId);

        logger.debug(
          tDefault("bumpReminder:log.database_cancelled_by_guild", {
            guildId,
          }),
        );
      },
      tDefault("bumpReminder:log.database_cancel_failed", {
        guildId,
      }),
    );
  }

  /**
   * 特定チャンネルのpendingリマインダーをキャンセル（重複防止用）
   * @param guildId キャンセル対象のギルドID
   * @param channelId キャンセル対象のチャンネルID
   * @returns 実行完了を示す Promise
   */
  async cancelByGuildAndChannel(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    await executeWithDatabaseError(
      async () => {
        await cancelPendingByGuildAndChannelUseCase(
          this.prisma,
          guildId,
          channelId,
        );

        logger.debug(
          tDefault("bumpReminder:log.database_cancelled_by_channel", {
            guildId,
            channelId,
          }),
        );
      },
      tDefault("bumpReminder:log.database_cancel_failed", {
        guildId,
        channelId,
      }),
    );
  }

  /**
   * 古いリマインダーをクリーンアップ
   * @param daysOld 何日前のデータを削除するか（デフォルト: 7日）
   * @returns 削除した件数
   */
  async cleanupOld(daysOld: number = 7): Promise<number> {
    return executeWithDatabaseError(async () => {
      const count = await cleanupOldBumpRemindersUseCase(this.prisma, daysOld);
      // PENDING は削除対象外にし、未実行タスクの痕跡を保持する

      logger.info(
        tDefault("bumpReminder:log.database_cleanup_completed", {
          count,
          days: daysOld,
        }),
      );

      return count;
    }, tDefault("bumpReminder:log.database_cleanup_failed"));
  }
}

/**
 * BumpReminderRepository インスタンスを生成する
 * @param prisma 利用する Prisma クライアント
 * @returns 新規の BumpReminderRepository インスタンス
 */
export function createBumpReminderRepository(
  prisma: PrismaClient,
): BumpReminderRepository {
  return new BumpReminderRepository(prisma);
}

// シングルトンインスタンス
let bumpReminderRepository: BumpReminderRepository | null = null;
let _cachedPrisma: PrismaClient | undefined;

/**
 * BumpReminderRepository のシングルトンインスタンスを取得
 * Prismaクライアントが変わった場合（テスト時のモック差し替えなど）は自動的に再生成する
 * @param prisma 利用する Prisma クライアント
 * @returns 共有の BumpReminderRepository インスタンス
 */
export function getBumpReminderRepository(
  prisma: PrismaClient,
): BumpReminderRepository {
  // 初回または Prisma 差し替え時に再生成
  if (!bumpReminderRepository || _cachedPrisma !== prisma) {
    bumpReminderRepository = createBumpReminderRepository(prisma);
    _cachedPrisma = prisma;
  }
  // 現在有効なシングルトンを返す
  return bumpReminderRepository;
}
