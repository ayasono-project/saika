// tests/unit/api/auth/guildAccess.test.ts
// ギルドアクセス検証 preHandler のユニットテスト（JWT クレームの管理可能ギルド判定）。

import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { createRequireGuildAccess } from "@/api/auth/guildAccess";
import type { SessionClaims } from "@/api/auth/jwt";
import { ApiHttpError } from "@/api/lib/httpError";

const reply = {} as FastifyReply;

function claims(guilds: string[]): SessionClaims {
  return {
    discordUserId: "u1",
    username: "u",
    globalName: null,
    avatar: null,
    guilds,
  };
}

function makeRequest(
  guildId: string | undefined,
  authUser: SessionClaims | undefined,
): FastifyRequest {
  return { params: { guildId }, authUser } as unknown as FastifyRequest;
}

describe("createRequireGuildAccess", () => {
  it("guildId がクレームに含まれれば通過し request.guildId を付与する", async () => {
    const handler = createRequireGuildAccess();
    const request = makeRequest("g1", claims(["g1", "g2"]));
    await handler(request, reply);
    expect(request.guildId).toBe("g1");
  });

  it("guildId がクレームに無ければ 403 FORBIDDEN", async () => {
    const handler = createRequireGuildAccess();
    await expect(
      handler(makeRequest("g3", claims(["g1", "g2"])), reply),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("authUser が無ければ 401 UNAUTHORIZED", async () => {
    const handler = createRequireGuildAccess();
    await expect(
      handler(makeRequest("g1", undefined), reply),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("authUser が無ければ ApiHttpError を投げる", async () => {
    const handler = createRequireGuildAccess();
    await expect(
      handler(makeRequest("g1", undefined), reply),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });

  it("guildId が無ければ 400 VALIDATION_ERROR", async () => {
    const handler = createRequireGuildAccess();
    await expect(
      handler(makeRequest(undefined, claims(["g1"])), reply),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
