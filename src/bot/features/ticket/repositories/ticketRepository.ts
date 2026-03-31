// src/bot/features/ticket/repositories/ticketRepository.ts
// チケットリポジトリ（Prisma実装）

import type { PrismaClient } from "@prisma/client";
import type {
  ITicketRepository,
  Ticket,
} from "../../../../shared/database/types";
import { tDefault } from "../../../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../../../shared/utils/errorHandling";
import { TICKET_STATUS } from "../commands/ticketCommand.constants";

export class TicketRepository implements ITicketRepository {
  private prisma: PrismaClient;

  /**
   * TicketRepository を初期化する
   * @param prisma Prisma クライアントインスタンス
   */
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * チケットをIDで検索する
   * @param id チケットID
   * @returns チケット（存在しない場合は null）
   */
  async findById(id: string): Promise<Ticket | null> {
    return executeWithDatabaseError(
      () => this.prisma.ticket.findUnique({ where: { id } }),
      tDefault("ticket:log.database_ticket_find_failed", { id }),
    );
  }

  /**
   * チャンネルIDでチケットを検索する
   * @param channelId チャンネルID
   * @returns チケット（存在しない場合は null）
   */
  async findByChannelId(channelId: string): Promise<Ticket | null> {
    return executeWithDatabaseError(
      () =>
        this.prisma.ticket.findFirst({
          where: { channelId },
        }),
      tDefault("ticket:log.database_ticket_find_by_channel_failed", {
        channelId,
      }),
    );
  }

  /**
   * 指定カテゴリ内のユーザーのオープンチケットを検索する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @param userId ユーザーID
   * @returns オープン状態のチケット一覧
   */
  async findOpenByUserAndCategory(
    guildId: string,
    categoryId: string,
    userId: string,
  ): Promise<Ticket[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.ticket.findMany({
          where: { guildId, categoryId, userId, status: TICKET_STATUS.OPEN },
        }),
      tDefault("ticket:log.database_ticket_find_open_failed", {
        guildId,
        categoryId,
        userId,
      }),
    );
  }

  /**
   * 指定カテゴリの全チケットを番号順で取得する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @returns チケット一覧（番号昇順）
   */
  async findAllByCategory(
    guildId: string,
    categoryId: string,
  ): Promise<Ticket[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.ticket.findMany({
          where: { guildId, categoryId },
          orderBy: { ticketNumber: "asc" },
        }),
      tDefault("ticket:log.database_ticket_find_all_by_category_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  /**
   * 指定カテゴリのオープンチケットを番号順で取得する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @returns オープン状態のチケット一覧（番号昇順）
   */
  async findOpenByCategory(
    guildId: string,
    categoryId: string,
  ): Promise<Ticket[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.ticket.findMany({
          where: { guildId, categoryId, status: TICKET_STATUS.OPEN },
          orderBy: { ticketNumber: "asc" },
        }),
      tDefault("ticket:log.database_ticket_find_all_by_category_failed", {
        guildId,
        categoryId,
      }),
    );
  }

  /**
   * ギルド内のクローズ済みチケットを全取得する
   * @param guildId ギルドID
   * @returns クローズ状態のチケット一覧
   */
  async findAllClosedByGuild(guildId: string): Promise<Ticket[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.ticket.findMany({
          where: { guildId, status: TICKET_STATUS.CLOSED },
        }),
      tDefault("ticket:log.database_ticket_find_closed_failed", { guildId }),
    );
  }

  /**
   * チケットを新規作成する
   * @param data チケットの作成データ（id, createdAt, updatedAt は自動生成）
   * @returns 作成されたチケット
   */
  async create(
    data: Omit<Ticket, "id" | "createdAt" | "updatedAt">,
  ): Promise<Ticket> {
    return executeWithDatabaseError(
      () => this.prisma.ticket.create({ data }),
      tDefault("ticket:log.database_ticket_create_failed", {
        guildId: data.guildId,
        categoryId: data.categoryId,
      }),
    );
  }

  /**
   * チケットを更新する
   * @param id チケットID
   * @param data 更新データ
   * @returns 更新後のチケット
   */
  async update(id: string, data: Partial<Ticket>): Promise<Ticket> {
    return executeWithDatabaseError(
      () => this.prisma.ticket.update({ where: { id }, data }),
      tDefault("ticket:log.database_ticket_update_failed", { id }),
    );
  }

  /**
   * チケットを削除する
   * @param id チケットID
   */
  async delete(id: string): Promise<void> {
    await executeWithDatabaseError(
      () => this.prisma.ticket.delete({ where: { id } }),
      tDefault("ticket:log.database_ticket_delete_failed", { id }),
    );
  }

  /**
   * 指定カテゴリの全チケットを削除する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @returns 削除されたチケット数
   */
  async deleteByCategory(guildId: string, categoryId: string): Promise<number> {
    const result = await executeWithDatabaseError(
      () =>
        this.prisma.ticket.deleteMany({
          where: { guildId, categoryId },
        }),
      tDefault("ticket:log.database_ticket_delete_by_category_failed", {
        guildId,
        categoryId,
      }),
    );
    return result.count;
  }

  /**
   * ギルドの全チケットを削除する
   * @param guildId ギルドID
   * @returns 削除されたチケット数
   */
  async deleteAllByGuild(guildId: string): Promise<number> {
    const result = await executeWithDatabaseError(
      () =>
        this.prisma.ticket.deleteMany({
          where: { guildId },
        }),
      tDefault("ticket:log.database_ticket_delete_all_failed", { guildId }),
    );
    return result.count;
  }
}

let repository: ITicketRepository | undefined;

/**
 * チケットリポジトリのシングルトンを取得する
 * @param prisma 初回呼び出し時に必要な Prisma クライアント
 * @returns チケットリポジトリのインスタンス
 */
export function getTicketRepository(prisma?: PrismaClient): ITicketRepository {
  if (!repository) {
    if (!prisma) {
      throw new Error(
        "TicketRepository is not initialized. Provide PrismaClient on first call.",
      );
    }
    repository = new TicketRepository(prisma);
  }
  return repository;
}
