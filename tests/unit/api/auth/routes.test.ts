// tests/unit/api/auth/routes.test.ts
// 認証ルート（/api/auth/*）の統合的ユニットテスト

import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DiscordOAuthService } from "@/api/auth/discordOAuthService";
import { signSessionToken } from "@/api/auth/jwt";
import { authRoutes } from "@/api/auth/routes";
import { toErrorResponse } from "@/api/lib/httpError";
import { localeManager } from "@/shared/locale/localeManager";

const DISCORD_USER = {
  id: "111",
  username: "user",
  global_name: "User",
  avatar: "av",
};

function makeOAuth(
  overrides: Partial<Record<keyof DiscordOAuthService, unknown>> = {},
): DiscordOAuthService {
  return {
    buildAuthorizeUrl: vi.fn(() => "https://discord.test/authorize?x=1"),
    exchangeCode: vi
      .fn()
      .mockResolvedValue({ access_token: "AT", refresh_token: "RT" }),
    fetchUser: vi.fn().mockResolvedValue(DISCORD_USER),
    revokeToken: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as DiscordOAuthService;
}

async function buildApp(oauth: DiscordOAuthService): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(error, "internal");
    reply.status(mapped.status).send(mapped.body);
  });
  await app.register(authRoutes, { prefix: "/api/auth", oauth });
  return app;
}

describe("authRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await localeManager.initialize();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /login は Discord 認可へ 302 し state Cookie を設定する", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({ method: "GET", url: "/api/auth/login" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://discord.test/authorize?x=1");
    expect(String(res.headers["set-cookie"])).toContain("oauth_state=");
  });

  it("GET /callback は error パラメータで access_denied へリダイレクト", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback?error=access_denied",
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/login?error=access_denied");
  });

  it("GET /callback は code 欠落で invalid_request へリダイレクト", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback?state=s",
    });
    expect(res.headers.location).toContain("/login?error=invalid_request");
  });

  it("GET /callback は state 不一致で invalid_state へリダイレクト", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=c&state=WRONG",
      cookies: { oauth_state: "RIGHT" },
    });
    expect(res.headers.location).toContain("/login?error=invalid_state");
  });

  it("GET /callback 成功で Cookie を設定し /servers へリダイレクト", async () => {
    const oauth = makeOAuth();
    app = await buildApp(oauth);
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=c&state=S",
      cookies: { oauth_state: "S" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/servers");
    const setCookie = String(res.headers["set-cookie"]);
    expect(setCookie).toContain("ayasono_session=");
    expect(setCookie).toContain("ayasono_refresh=");
    expect(oauth.exchangeCode).toHaveBeenCalledWith("c");
  });

  it("GET /callback はトークン交換失敗で callback_failed へリダイレクト", async () => {
    const oauth = makeOAuth({
      exchangeCode: vi.fn().mockRejectedValue(new Error("boom")),
    });
    app = await buildApp(oauth);
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=c&state=S",
      cookies: { oauth_state: "S" },
    });
    expect(res.headers.location).toContain("/login?error=callback_failed");
  });

  it("GET /me は有効な JWT Cookie でユーザーを返す", async () => {
    app = await buildApp(makeOAuth());
    const token = await signSessionToken({
      discordUserId: "111",
      username: "user",
      globalName: "User",
      avatar: "av",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { ayasono_session: token },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: { id: "111", username: "user", globalName: "User", avatar: "av" },
    });
  });

  it("GET /me は Cookie 無しで 401", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  it("POST /logout はトークン失効と Cookie 削除を行う", async () => {
    const oauth = makeOAuth();
    app = await buildApp(oauth);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { ayasono_refresh: "RT" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { success: true } });
    expect(oauth.revokeToken).toHaveBeenCalledWith("RT");
  });

  it("POST /refresh はセッション無しで 401", async () => {
    app = await buildApp(makeOAuth());
    const res = await app.inject({ method: "POST", url: "/api/auth/refresh" });
    expect(res.statusCode).toBe(401);
  });
});
