// src/api/lib/httpError.ts
// API 層の HTTP エラー表現と、例外 → レスポンス封筒への変換

import type { ApiErrorCode, ApiErrorResponse } from "@ayasono/shared/api";
import { BaseError } from "@ayasono/shared/core";

/**
 * HTTP ステータスと API エラーコードの対応表。
 * BaseError（@ayasono/shared/core）は statusCode を持つが API エラーコードは持たないため、
 * statusCode からダッシュボード契約の {@link ApiErrorCode} へ写像する。
 */
const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

/** API エラーコードに対応する既定 HTTP ステータス */
const CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  DISCORD_API_ERROR: 502,
  INTERNAL_ERROR: 500,
};

/** デフォルトの内部エラーステータス */
const INTERNAL_STATUS = 500;

/**
 * API レイヤーで明示的に投げる HTTP エラー。
 * BaseError 階層に無い 401（UNAUTHORIZED）を含め、ルートハンドラから契約コードを直接指定できる。
 */
export class ApiHttpError extends Error {
  /** API 契約のエラーコード */
  public readonly code: ApiErrorCode;
  /** HTTP ステータスコード */
  public readonly status: number;
  /** 付加情報（バリデーション詳細など、任意） */
  public readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.code = code;
    this.status = CODE_TO_STATUS[code];
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static unauthorized(message: string, details?: unknown): ApiHttpError {
    return new ApiHttpError("UNAUTHORIZED", message, details);
  }

  static forbidden(message: string, details?: unknown): ApiHttpError {
    return new ApiHttpError("FORBIDDEN", message, details);
  }

  static notFound(message: string, details?: unknown): ApiHttpError {
    return new ApiHttpError("NOT_FOUND", message, details);
  }

  static validation(message: string, details?: unknown): ApiHttpError {
    return new ApiHttpError("VALIDATION_ERROR", message, details);
  }

  static conflict(message: string, details?: unknown): ApiHttpError {
    return new ApiHttpError("CONFLICT", message, details);
  }
}

/** 例外から導出した HTTP レスポンス（ステータス + 封筒 + ログ判定） */
export interface MappedError {
  /** HTTP ステータスコード */
  status: number;
  /** クライアントへ返すエラー封筒 */
  body: ApiErrorResponse;
  /** プログラミングエラー（バグの可能性）か。true ならログを error レベルで出す */
  isUnexpected: boolean;
}

/**
 * Fastify が付与する statusCode を持つエラーかを判定する。
 */
function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

/**
 * 任意の例外を API エラーレスポンスへ変換する。
 *
 * - {@link ApiHttpError}: code/status/details をそのまま使用
 * - {@link BaseError}（DiscordApiError 等）: name/statusCode から契約コードを導出
 * - Fastify エラー（statusCode 付き・レート制限など）: statusCode から導出
 * - その他: 500 INTERNAL_ERROR（詳細は隠蔽し、isUnexpected=true でログ）
 *
 * @param error 捕捉した例外
 * @param fallbackMessage 内部エラー時にクライアントへ返す既定メッセージ
 */
export function toErrorResponse(
  error: unknown,
  fallbackMessage: string,
): MappedError {
  if (error instanceof ApiHttpError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      isUnexpected: false,
    };
  }

  if (error instanceof BaseError) {
    const status = error.statusCode ?? INTERNAL_STATUS;
    const code: ApiErrorCode =
      error.name === "DiscordApiError"
        ? "DISCORD_API_ERROR"
        : (STATUS_TO_CODE[status] ?? "INTERNAL_ERROR");
    // 5xx かつ非運用エラーはバグの可能性 → 詳細を隠蔽
    const isUnexpected = status >= INTERNAL_STATUS && !error.isOperational;
    return {
      status,
      body: {
        error: {
          code,
          message: isUnexpected ? fallbackMessage : error.message,
        },
      },
      isUnexpected,
    };
  }

  if (hasStatusCode(error)) {
    const status = error.statusCode;
    const code = STATUS_TO_CODE[status] ?? "INTERNAL_ERROR";
    const message =
      error instanceof Error && status < INTERNAL_STATUS
        ? error.message
        : fallbackMessage;
    return {
      status,
      body: { error: { code, message } },
      isUnexpected: status >= INTERNAL_STATUS,
    };
  }

  return {
    status: INTERNAL_STATUS,
    body: { error: { code: "INTERNAL_ERROR", message: fallbackMessage } },
    isUnexpected: true,
  };
}
