// src/shared/errors/processErrorHandler.ts
// プロセス全体の未処理例外とシャットダウン制御

import { logPrefixed } from "../locale/localeManager";
import { logger } from "../utils/logger";
import { BaseError } from "./customErrors";
import { logError } from "./errorUtils";

// プロセスイベント名・シグナル名・終了コードを集約する定数
const PROCESS_ERROR_CONSTANTS = {
  PROCESS_EVENT: {
    UNHANDLED_REJECTION: "unhandledRejection",
    UNCAUGHT_EXCEPTION: "uncaughtException",
    WARNING: "warning",
  },
  SIGNAL: {
    SIGTERM: "SIGTERM",
    SIGINT: "SIGINT",
  },
  EXIT_CODE: {
    SUCCESS: 0,
    FAILURE: 1,
  },
} as const;

/**
 * 依存ライブラリ由来の既知 DeprecationWarning コード
 * 自コードでは修正できないものをここに列挙した場合はアプリログへの出力をスキップする。
 * Node.js 本来の stderr への出力は維持される（意図的な非抑制）。
 */
const IGNORED_DEPRECATION_CODES = new Set<string>([
  // 現在、アプリログのみ抑制している既知コードはない
]);

// setupGlobalErrorHandlers の重複登録を防ぐフラグ
let _globalHandlersRegistered = false;
// setupGracefulShutdown の重複登録を防ぐフラグ
let _gracefulShutdownRegistered = false;
// シャットダウン処理の多重実行を防ぐフラグ
let _shutdownInProgress = false;

/**
 * グローバル未処理エラーハンドラを登録する関数
 */
export const setupGlobalErrorHandlers = (): void => {
  // 多重登録を防止
  if (_globalHandlersRegistered) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.bot",
        "system:error.global_handlers_already_registered",
      ),
    );
    return;
  }
  _globalHandlersRegistered = true;

  // Promise 未処理拒否を記録
  process.on(
    PROCESS_ERROR_CONSTANTS.PROCESS_EVENT.UNHANDLED_REJECTION,
    (reason: unknown, promise: Promise<unknown>) => {
      logger.error(
        logPrefixed(
          "system:log_prefix.bot",
          "system:error.unhandled_rejection_log",
        ),
        {
          reason,
          promise,
        },
      );

      // reason が Error の場合は共通ログ形式へ流す
      if (reason instanceof Error) {
        logError(reason);
      }
    },
  );

  // 未捕捉例外を記録
  process.on(
    PROCESS_ERROR_CONSTANTS.PROCESS_EVENT.UNCAUGHT_EXCEPTION,
    (error: Error) => {
      logger.error(
        logPrefixed(
          "system:log_prefix.bot",
          "system:error.uncaught_exception_log",
        ),
        error,
      );
      logError(error);

      // 非運用系 BaseError はプロセス終了で早期遮断
      if (error instanceof BaseError && !error.isOperational) {
        process.exit(PROCESS_ERROR_CONSTANTS.EXIT_CODE.FAILURE);
      }
    },
  );

  // Node 警告を記録（依存ライブラリ由来の既知 DeprecationWarning は無視）
  process.on(
    PROCESS_ERROR_CONSTANTS.PROCESS_EVENT.WARNING,
    (warning: Error & { code?: string }) => {
      /* c8 ignore start -- IGNORED_DEPRECATION_CODES は現在空のため構造上到達不可 */
      if (
        warning.name === "DeprecationWarning" &&
        IGNORED_DEPRECATION_CODES.has(warning.code ?? "")
      ) {
        return;
      }
      /* c8 ignore stop */
      logger.warn(
        logPrefixed("system:log_prefix.bot", "system:error.node_warning"),
        {
          name: warning.name,
          message: warning.message,
          stack: warning.stack,
        },
      );
    },
  );
};

/**
 * シグナル受信時のグレースフルシャットダウン処理を登録する関数
 */
export const setupGracefulShutdown = (cleanup?: () => Promise<void>): void => {
  // 多重登録を防止
  if (_gracefulShutdownRegistered) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.bot",
        "system:error.shutdown_handlers_already_registered",
      ),
    );
    return;
  }
  _gracefulShutdownRegistered = true;

  const shutdown = async (signal: string) => {
    // 多重実行を防止
    if (_shutdownInProgress) {
      logger.warn(
        logPrefixed(
          "system:log_prefix.bot",
          "system:shutdown.already_in_progress",
          { signal },
        ),
      );
      return;
    }
    _shutdownInProgress = true;

    logger.info(
      logPrefixed("system:log_prefix.bot", "system:shutdown.signal_received", {
        signal,
      }),
    );

    // 任意のクリーンアップを実行して正常終了
    try {
      if (cleanup) {
        await cleanup();
      }
      logger.info(
        logPrefixed(
          "system:log_prefix.bot",
          "system:shutdown.cleanup_complete",
        ),
      );
      // 正常クリーンアップ完了として 0 終了
      process.exit(PROCESS_ERROR_CONSTANTS.EXIT_CODE.SUCCESS);
    } catch (error) {
      // クリーンアップ失敗時は異常終了
      logger.error(
        logPrefixed("system:log_prefix.bot", "system:shutdown.cleanup_failed"),
        error,
      );
      process.exit(PROCESS_ERROR_CONSTANTS.EXIT_CODE.FAILURE);
    }
  };

  // SIGTERM/SIGINT を1回だけ捕捉
  process.once(PROCESS_ERROR_CONSTANTS.SIGNAL.SIGTERM, () => {
    void shutdown(PROCESS_ERROR_CONSTANTS.SIGNAL.SIGTERM);
  });
  process.once(PROCESS_ERROR_CONSTANTS.SIGNAL.SIGINT, () => {
    void shutdown(PROCESS_ERROR_CONSTANTS.SIGNAL.SIGINT);
  });
};
