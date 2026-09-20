// Fastify API スキャフォールドの統合的ユニットテスト（app.inject 利用）

import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BODY_LIMIT_BYTES, RATE_LIMIT } from "@/api/constants";
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

// 本番経路で観測したコンテナの接続元（Docker ネットワークのゲートウェイ・2026-09-20 実測）
const GATEWAY = "10.0.1.1";
// 以下は文書用に予約されたアドレス（RFC 5737 / RFC 3849）
const CLIENT = "203.0.113.7";
const OTHER_CLIENT = "203.0.113.8";
const SPOOFED = "198.51.100.66";
const UNTRUSTED_PEER = "192.0.2.10";

/**
 * request.ip を返す検証用ルートを足した API アプリを構築する
 * @returns /__ip を追加した Fastify インスタンス
 */
async function buildAppWithIpRoute(): Promise<FastifyInstance> {
  const built = await buildApiServer(makeDeps());
  built.get("/__ip", async (request) => ({ ip: request.ip }));
  return built;
}

/**
 * 接続元と X-Forwarded-For を指定して /__ip を叩く
 * @param target 叩く Fastify インスタンス
 * @param remoteAddress TCP の接続元（直前ホップ）
 * @param forwardedFor X-Forwarded-For の値（省略時は付けない）
 * @returns inject の応答
 */
function requestIp(
  target: FastifyInstance,
  remoteAddress: string,
  forwardedFor?: string,
) {
  return target.inject({
    method: "GET",
    url: "/__ip",
    remoteAddress,
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
  });
}

// API サーバーの構築・ヘルスチェック・CORS・エラー封筒・クライアント IP の判定を検証する
describe("buildApiServer", () => {
  let app: FastifyInstance;

  // 実際の翻訳文字列で挙動を確認するため i18n を初期化する
  beforeAll(async () => {
    await localeManager.initialize();
  });

  // ケースごとに構築したアプリを閉じ、レート制限の計数を持ち越さない
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

  it("PATCH/DELETE のプリフライトを許可する（保存・削除用）", async () => {
    const origin = env.WEB_ORIGIN.split(",")[0].trim();
    app = await buildApiServer(makeDeps());
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/guilds/123/config",
      headers: {
        origin,
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "content-type",
      },
    });
    const allow = String(res.headers["access-control-allow-methods"] ?? "");
    expect(allow).toContain("PATCH");
    expect(allow).toContain("DELETE");
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

  // trustProxy とレート制限の組み合わせが、X-Forwarded-For の偽装で崩れないことを固定する。
  // どのケースも「true に戻す」「中継数指定にする」「信頼範囲が足りない」「rate-limit を 11.1.0 に戻す」の
  // いずれかで落ちるように組んである（TODO「Web API のレート制限すり抜けの恒久対応」）
  describe("クライアント IP の判定とレート制限", () => {
    const remainingAfter = (count: number) => String(RATE_LIMIT.max - count);

    it("信頼範囲の中継から来た偽の X-Forwarded-For 先頭は無視し、Cloudflare が末尾に付けた IP を採る", async () => {
      app = await buildAppWithIpRoute();
      const res = await requestIp(app, GATEWAY, `${SPOOFED}, ${CLIENT}`);
      expect(res.json().ip).toBe(CLIENT);
    });

    it("信頼範囲外から直接来た接続は X-Forwarded-For を信じず接続元をそのまま採る", async () => {
      app = await buildAppWithIpRoute();
      const res = await requestIp(app, UNTRUSTED_PEER, SPOOFED);
      expect(res.json().ip).toBe(UNTRUSTED_PEER);
    });

    it("X-Forwarded-For の先頭を毎回変えても同じクライアントは同じ枠で数えられる", async () => {
      app = await buildAppWithIpRoute();
      const remaining: string[] = [];
      for (const spoofed of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) {
        const res = await requestIp(app, GATEWAY, `${spoofed}, ${CLIENT}`);
        remaining.push(String(res.headers["x-ratelimit-remaining"]));
      }
      expect(remaining).toEqual([
        remainingAfter(1),
        remainingAfter(2),
        remainingAfter(3),
      ]);
    });

    it("別のクライアントは同じ中継を通っても別の枠で数えられる", async () => {
      app = await buildAppWithIpRoute();
      const first = await requestIp(app, GATEWAY, CLIENT);
      const second = await requestIp(app, GATEWAY, OTHER_CLIENT);
      expect(first.headers["x-ratelimit-remaining"]).toBe(remainingAfter(1));
      expect(second.headers["x-ratelimit-remaining"]).toBe(remainingAfter(1));
    });

    it("bodyLimit を超える本文は認証に届く前に 413 で弾かれる", async () => {
      app = await buildAppWithIpRoute();
      const res = await app.inject({
        method: "POST",
        url: "/api/guilds/123/config",
        headers: { "content-type": "application/json" },
        payload: `{"a":"${"x".repeat(BODY_LIMIT_BYTES)}"}`,
      });
      expect(res.statusCode).toBe(413);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("同じ /64 に属する IPv6 アドレスは同じ枠で数えられる（CVE-2026-15144）", async () => {
      app = await buildAppWithIpRoute();
      const first = await requestIp(app, GATEWAY, "2001:db8:1:2::1");
      const second = await requestIp(app, GATEWAY, "2001:db8:1:2::ffff");
      expect(first.headers["x-ratelimit-remaining"]).toBe(remainingAfter(1));
      expect(second.headers["x-ratelimit-remaining"]).toBe(remainingAfter(2));
    });
  });
});
