// ギルドアクセス検証 preHandler のユニットテスト（JWT クレームの管理可能ギルド判定と Bot の参加判定）。

import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { createRequireGuildAccess } from "@/api/auth/guildAccess";
import type { SessionClaims } from "@/api/auth/jwt";
import { ApiHttpError } from "@/api/lib/httpError";
import type { BotClient } from "@/bot/client";

const reply = {} as FastifyReply;

// Bot は g1 / g2 にだけ参加している（g4 はユーザーが管理できるが Bot が居ないギルド）
const client = {
  guilds: {
    cache: new Map([
      ["g1", {}],
      ["g2", {}],
    ]),
  },
} as unknown as BotClient;

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
    const handler = createRequireGuildAccess(client);
    const request = makeRequest("g1", claims(["g1", "g2"]));
    await handler(request, reply);
    expect(request.guildId).toBe("g1");
  });

  it("guildId がクレームに無ければ 403 FORBIDDEN", async () => {
    const handler = createRequireGuildAccess(client);
    await expect(
      handler(makeRequest("g3", claims(["g1", "g2"])), reply),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("Bot が参加していないギルドは権限があっても 404 NOT_FOUND", async () => {
    const handler = createRequireGuildAccess(client);
    const request = makeRequest("g4", claims(["g1", "g4"]));
    await expect(handler(request, reply)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(request.guildId).toBeUndefined();
  });

  it("権限の無い未参加ギルドは 404 ではなく 403 FORBIDDEN（参加有無を漏らさない）", async () => {
    const handler = createRequireGuildAccess(client);
    await expect(
      handler(makeRequest("g4", claims(["g1"])), reply),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("Bot が参加しているギルドでも権限が無ければ 403 FORBIDDEN（参加判定で権限判定を代替しない）", async () => {
    const handler = createRequireGuildAccess(client);
    const request = makeRequest("g2", claims(["g1"]));
    await expect(handler(request, reply)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(request.guildId).toBeUndefined();
  });

  it("authUser が無ければ 401 UNAUTHORIZED", async () => {
    const handler = createRequireGuildAccess(client);
    await expect(
      handler(makeRequest("g1", undefined), reply),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("authUser が無ければ ApiHttpError を投げる", async () => {
    const handler = createRequireGuildAccess(client);
    await expect(
      handler(makeRequest("g1", undefined), reply),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });

  it("guildId が無ければ 400 VALIDATION_ERROR", async () => {
    const handler = createRequireGuildAccess(client);
    await expect(
      handler(makeRequest(undefined, claims(["g1"])), reply),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
