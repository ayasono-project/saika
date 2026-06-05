// tests/unit/api/auth/authenticate.test.ts
// 認証 preHandler のユニットテスト（Cookie のセッション JWT 検証）。

import type { FastifyReply, FastifyRequest } from "fastify";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  DEV_JWT_SECRET_FALLBACK,
  JWT_COOKIE_NAME,
} from "@/api/auth/authConstants";
import { createAuthenticate } from "@/api/auth/authenticate";
import { ApiHttpError } from "@/api/lib/httpError";
import { env } from "@/shared/config/env";

// 検証側と同じ鍵で署名する（ローカル .env の JWT_SECRET に依存しない）
const KEY = new TextEncoder().encode(env.JWT_SECRET ?? DEV_JWT_SECRET_FALLBACK);
const reply = {} as FastifyReply;

/** web BFF が発行したセッション JWT を模す */
async function signToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    discordUserId: "u1",
    username: "u",
    globalName: null,
    avatar: null,
    guilds: ["g1"],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 900)
    .sign(KEY);
}

function makeRequest(cookies: Record<string, string>): FastifyRequest {
  return { cookies } as unknown as FastifyRequest;
}

describe("createAuthenticate", () => {
  it("有効な JWT Cookie でクレームを request.authUser に付与する", async () => {
    const handler = createAuthenticate();
    const request = makeRequest({ [JWT_COOKIE_NAME]: await signToken() });
    await handler(request, reply);
    expect(request.authUser).toMatchObject({
      discordUserId: "u1",
      guilds: ["g1"],
    });
  });

  it("Cookie が無ければ 401 UNAUTHORIZED", async () => {
    const handler = createAuthenticate();
    await expect(handler(makeRequest({}), reply)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("不正な JWT は 401 UNAUTHORIZED", async () => {
    const handler = createAuthenticate();
    await expect(
      handler(makeRequest({ [JWT_COOKIE_NAME]: "garbage" }), reply),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });
});
