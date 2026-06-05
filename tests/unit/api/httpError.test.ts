// tests/unit/api/httpError.test.ts
// API 例外 → エラー封筒変換のユニットテスト

import {
  DatabaseError,
  DiscordApiError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ValidationError,
} from "@ayasono/shared/core";
import { describe, expect, it } from "vitest";
import { ApiHttpError, toErrorResponse } from "@/api/lib/httpError";

const FALLBACK = "内部サーバーエラー";

describe("ApiHttpError", () => {
  it("ファクトリが正しい code/status を割り当てる", () => {
    expect(ApiHttpError.unauthorized("x").status).toBe(401);
    expect(ApiHttpError.unauthorized("x").code).toBe("UNAUTHORIZED");
    expect(ApiHttpError.forbidden("x").status).toBe(403);
    expect(ApiHttpError.notFound("x").status).toBe(404);
    expect(ApiHttpError.validation("x").status).toBe(400);
    expect(ApiHttpError.conflict("x").status).toBe(409);
  });
});

describe("toErrorResponse", () => {
  it("ApiHttpError は code/message/details をそのまま封筒化する", () => {
    const err = ApiHttpError.validation("bad input", { field: "name" });
    const mapped = toErrorResponse(err, FALLBACK);
    expect(mapped.status).toBe(400);
    expect(mapped.isUnexpected).toBe(false);
    expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
    expect(mapped.body.error.message).toBe("bad input");
    expect(mapped.body.error.details).toEqual({ field: "name" });
  });

  it("UNAUTHORIZED（BaseError 階層に無い）を表現できる", () => {
    const mapped = toErrorResponse(
      ApiHttpError.unauthorized("login"),
      FALLBACK,
    );
    expect(mapped.status).toBe(401);
    expect(mapped.body.error.code).toBe("UNAUTHORIZED");
  });

  it("BaseError の statusCode から契約コードを導出する", () => {
    expect(
      toErrorResponse(new NotFoundError("x"), FALLBACK).body.error.code,
    ).toBe("NOT_FOUND");
    expect(
      toErrorResponse(new ValidationError("x"), FALLBACK).body.error.code,
    ).toBe("VALIDATION_ERROR");
    expect(
      toErrorResponse(new PermissionError("x"), FALLBACK).body.error.code,
    ).toBe("FORBIDDEN");
    expect(
      toErrorResponse(new RateLimitError("x"), FALLBACK).body.error.code,
    ).toBe("RATE_LIMITED");
  });

  it("DiscordApiError は name から DISCORD_API_ERROR に写像する", () => {
    const mapped = toErrorResponse(
      new DiscordApiError("discord down"),
      FALLBACK,
    );
    expect(mapped.body.error.code).toBe("DISCORD_API_ERROR");
  });

  it("5xx かつ非運用エラーは詳細を隠蔽し isUnexpected=true", () => {
    const mapped = toErrorResponse(
      new DatabaseError("secret", false),
      FALLBACK,
    );
    expect(mapped.status).toBe(500);
    expect(mapped.isUnexpected).toBe(true);
    expect(mapped.body.error.code).toBe("INTERNAL_ERROR");
    expect(mapped.body.error.message).toBe(FALLBACK);
  });

  it("Fastify 風 statusCode 付きエラー（4xx）は message を残す", () => {
    const fastifyErr = Object.assign(new Error("too many"), {
      statusCode: 429,
    });
    const mapped = toErrorResponse(fastifyErr, FALLBACK);
    expect(mapped.status).toBe(429);
    expect(mapped.body.error.code).toBe("RATE_LIMITED");
    expect(mapped.body.error.message).toBe("too many");
    expect(mapped.isUnexpected).toBe(false);
  });

  it("未知の例外は 500 INTERNAL_ERROR にフォールバックする", () => {
    const mapped = toErrorResponse("boom", FALLBACK);
    expect(mapped.status).toBe(500);
    expect(mapped.body.error.code).toBe("INTERNAL_ERROR");
    expect(mapped.body.error.message).toBe(FALLBACK);
    expect(mapped.isUnexpected).toBe(true);
  });
});
