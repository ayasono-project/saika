// src/shared/utils/prisma.ts
// Prisma関連のユーティリティ関数

import type { PrismaClient } from "@prisma/client";
import { logPrefixed, tDefault } from "../locale/localeManager";
import { logger } from "./logger";

// モジュールレベルでPrismaクライアントを保持（global変数を使わない）
let _prismaClient: PrismaClient | undefined;

/**
 * Prismaクライアントを登録
 * アプリ起動時に一度だけ呼び出す
 */
export function setPrismaClient(prisma: PrismaClient): void {
  // 起動時に初期化済みクライアントを保存
  _prismaClient = prisma;
}

/**
 * Prismaクライアントを取得
 */
export function getPrismaClient(): PrismaClient | null {
  // 未初期化時は null を返し、利用可否を呼び出し側で判定可能にする
  return _prismaClient ?? null;
}

/**
 * Prismaクライアントを取得（必須）
 * @throws {Error} Prismaクライアントが利用できない場合
 */
export function requirePrismaClient(): PrismaClient {
  // 任意取得APIを使って存在確認を一元化
  const prisma = getPrismaClient();
  if (!prisma) {
    // 必須経路で未初期化は即時エラーとして扱う
    const message = tDefault("system:database.prisma_not_available");
    const error = new Error(message);
    logger.error(
      logPrefixed(
        "system:log_prefix.database",
        "system:database.prisma_not_available",
      ),
      error,
    );
    throw error;
  }
  // 利用可能なクライアントを返す
  return prisma;
}
