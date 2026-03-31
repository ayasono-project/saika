// src/shared/errors/errorHandler.ts
// エラーハンドリング機能の公開エントリーポイント
/* c8 ignore file */

// Discord非依存のエラーユーティリティ
export { getUserFriendlyMessage, logError, toError } from "./errorUtils";

// プロセス全体（未処理例外/シグナル）向けエラーハンドリング
export {
  setupGlobalErrorHandlers,
  setupGracefulShutdown,
} from "./processErrorHandler";
