// src/shared/utils/errorHandling.ts
// 共通エラーハンドリングユーティリティ

import { DatabaseError } from "../errors/customErrors";
import { logger } from "./logger";

/**
 * DB操作を実行し、失敗時はログ出力してDatabaseErrorへ変換する
 * @param operation 実行する非同期処理
 * @param message ログ・例外に使うメッセージ
 * @returns operation の結果
 */
export async function executeWithDatabaseError<T>(
  operation: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(message, error);
    throw new DatabaseError(message);
  }
}

/**
 * 処理失敗時に例外を再送出せずログのみを記録する
 * @param operation 実行する非同期処理
 * @param message ログメッセージ
 * @returns 実行完了
 */
export async function executeWithLoggedError(
  operation: () => Promise<void>,
  message: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    logger.error(message, error);
  }
}
