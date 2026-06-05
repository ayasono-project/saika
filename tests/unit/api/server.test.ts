// tests/unit/api/server.test.ts
// Fastify API スキャフォールドの統合的ユニットテスト（app.inject 利用）

import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "@/api/lib/httpError";
import { buildApiServer } from "@/api/server";
import type { ApiServerDeps } from "@/api/types";
import type { BotClient } from "@/bot/client";
import { env } from "@/shared/config/env";
import { localeManager } from "@/shared/locale/localeManager";

/** ready 判定が通る依存のモックを生成する */
function makeDeps(overrides?: {
  ready?: boolean;
  queryRejects?: boolean;
}): ApiServerDeps {
  const client = {
    isReady: vi.fn(() => overrides?.ready ?? true),
  } as unknown as BotClient;
  const prisma = {
    $queryRaw: overrides?.queryRejects
      ? vi.fn().mockRejectedValue(new Error("db down"))
      : vi.fn().mockResolvedValue([{ "1": 1 }]),
  } as unknown as PrismaClient;
  return { client, prisma };
}

describe("buildApiServer", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 実際の翻訳文字列で挙動を確認するため i18n を初期化
    await localeManager.initialize();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /health は 200 と status:ok を返す", async () => {
    app = await buildApiServer(makeDeps());
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /api はメタ情報を data 封筒で返す", async () => {
    app = await buildApiServer(makeDeps());
    const res = await app.inject({ method: "GET", url: "/api" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { name: "saika API", version: 1 } });
  });

  it("GET /ready は DB 疎通 + client ready で 200", async () => {
    const deps = makeDeps();
    app = await buildApiServer(deps);
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ready" });
    expect(deps.prisma.$queryRaw).toHaveBeenCalled();
  });

  it("GET /ready は DB エラー時に 503 を返す", async () => {
    app = await buildApiServer(makeDeps({ queryRejects: true }));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe("INTERNAL_ERROR");
  });

  it("GET /ready は client 未 ready 時に 503 を返す", async () => {
    app = await buildApiServer(makeDeps({ ready: false }));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
  });

  it("未定義ルートは 404 NOT_FOUND 封筒を返す", async () => {
    app = await buildApiServer(makeDeps());
    const res = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("許可オリジンには CORS ヘッダーを付与する", async () => {
    // ローカル .env の WEB_ORIGIN に依存しないよう、設定値の先頭オリジンを使う
    const origin = env.WEB_ORIGIN.split(",")[0].trim();
    app = await buildApiServer(makeDeps());
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin },
    });
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("setErrorHandler が ApiHttpError を契約封筒へ変換する", async () => {
    app = await buildApiServer(makeDeps());
    app.get("/__throw_api", async () => {
      throw ApiHttpError.forbidden("nope");
    });
    const res = await app.inject({ method: "GET", url: "/__throw_api" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
    expect(res.json().error.message).toBe("nope");
  });

  it("setErrorHandler が未知の例外を 500 INTERNAL_ERROR にする", async () => {
    app = await buildApiServer(makeDeps());
    app.get("/__throw_unknown", async () => {
      throw new Error("kaboom");
    });
    const res = await app.inject({ method: "GET", url: "/__throw_unknown" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe("INTERNAL_ERROR");
    // 内部詳細はクライアントに漏らさない
    expect(res.json().error.message).not.toBe("kaboom");
  });
});
