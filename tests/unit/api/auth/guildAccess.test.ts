// tests/unit/api/auth/guildAccess.test.ts
// ギルド権限検証 preHandler とキャッシュのユニットテスト

import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { REFRESH_COOKIE_NAME } from "@/api/auth/authConstants";
import type {
  DiscordOAuthService,
  DiscordPartialGuild,
} from "@/api/auth/discordOAuthService";
import {
  createRequireGuildAccess,
  GuildAccessCache,
} from "@/api/auth/guildAccess";
import { ApiHttpError } from "@/api/lib/httpError";

const GUILD_MANAGE: DiscordPartialGuild = {
  id: "g-manage",
  name: "Manage",
  icon: null,
  owner: false,
  permissions: String(1n << 5n), // ManageGuild
};
const GUILD_OWNER: DiscordPartialGuild = {
  id: "g-owner",
  name: "Owner",
  icon: null,
  owner: true,
  permissions: "0",
};
const GUILD_NONE: DiscordPartialGuild = {
  id: "g-none",
  name: "None",
  icon: null,
  owner: false,
  permissions: "0",
};

function makeReply(): FastifyReply {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as FastifyReply;
}

function makeRequest(
  guildId: string | undefined,
  authUser: { discordUserId: string } | undefined,
): FastifyRequest {
  return {
    params: { guildId },
    cookies: { [REFRESH_COOKIE_NAME]: "RT" },
    authUser,
  } as unknown as FastifyRequest;
}

function makeOAuth(guilds: DiscordPartialGuild[]): DiscordOAuthService {
  return {
    refreshAccessToken: vi
      .fn()
      .mockResolvedValue({ access_token: "AT", refresh_token: "RT2" }),
    fetchUserGuilds: vi.fn().mockResolvedValue(guilds),
  } as unknown as DiscordOAuthService;
}

describe("GuildAccessCache", () => {
  it("set した値を get で取得できる", () => {
    const cache = new GuildAccessCache();
    cache.set("u1", [GUILD_OWNER]);
    expect(cache.get("u1")).toEqual([GUILD_OWNER]);
  });

  it("未登録ユーザーは null", () => {
    expect(new GuildAccessCache().get("nope")).toBeNull();
  });
});

describe("createRequireGuildAccess", () => {
  const cache = new GuildAccessCache();

  it("ManageGuild 権限があれば通過し request.guildId を付与する", async () => {
    const handler = createRequireGuildAccess(makeOAuth([GUILD_MANAGE]), cache);
    const request = makeRequest("g-manage", { discordUserId: "u1" });
    await handler(request, makeReply());
    expect(request.guildId).toBe("g-manage");
  });

  it("オーナーなら通過する", async () => {
    const handler = createRequireGuildAccess(makeOAuth([GUILD_OWNER]), cache);
    const request = makeRequest("g-owner", { discordUserId: "u2" });
    await handler(request, makeReply());
    expect(request.guildId).toBe("g-owner");
  });

  it("権限不足は 403 FORBIDDEN", async () => {
    const handler = createRequireGuildAccess(makeOAuth([GUILD_NONE]), cache);
    await expect(
      handler(makeRequest("g-none", { discordUserId: "u3" }), makeReply()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("非メンバーは 403 FORBIDDEN", async () => {
    const handler = createRequireGuildAccess(makeOAuth([GUILD_OWNER]), cache);
    await expect(
      handler(makeRequest("other-guild", { discordUserId: "u4" }), makeReply()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("authUser が無ければ 401 UNAUTHORIZED", async () => {
    const handler = createRequireGuildAccess(makeOAuth([]), cache);
    await expect(
      handler(makeRequest("g-owner", undefined), makeReply()),
    ).rejects.toBeInstanceOf(ApiHttpError);
  });

  it("guildId が無ければ 400 VALIDATION_ERROR", async () => {
    const handler = createRequireGuildAccess(makeOAuth([]), cache);
    await expect(
      handler(makeRequest(undefined, { discordUserId: "u5" }), makeReply()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("2 回目はキャッシュから取得し Discord を再呼び出ししない", async () => {
    const freshCache = new GuildAccessCache();
    const oauth = makeOAuth([GUILD_OWNER]);
    const handler = createRequireGuildAccess(oauth, freshCache);
    await handler(makeRequest("g-owner", { discordUserId: "u6" }), makeReply());
    await handler(makeRequest("g-owner", { discordUserId: "u6" }), makeReply());
    expect(oauth.fetchUserGuilds).toHaveBeenCalledTimes(1);
  });
});
