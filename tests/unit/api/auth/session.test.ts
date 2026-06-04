// tests/unit/api/auth/session.test.ts
// セッション解決・access トークン取得・変換のユニットテスト

import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/api/auth/authConstants";
import type { DiscordOAuthService } from "@/api/auth/discordOAuthService";
import { signSessionToken } from "@/api/auth/jwt";
import {
  getDiscordAccessToken,
  resolveSession,
  timingSafeCompare,
  toAuthUser,
  toSessionPayload,
} from "@/api/auth/session";

function makeReply(): FastifyReply {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as FastifyReply;
}

function makeRequest(cookies: Record<string, string>): FastifyRequest {
  return { cookies } as unknown as FastifyRequest;
}

const DISCORD_USER = {
  id: "111",
  username: "user",
  global_name: "User",
  avatar: "av",
};

describe("変換ヘルパー", () => {
  it("toSessionPayload は Discord ユーザーをペイロード化する", () => {
    expect(toSessionPayload(DISCORD_USER)).toEqual({
      discordUserId: "111",
      username: "user",
      globalName: "User",
      avatar: "av",
    });
  });

  it("toAuthUser は契約の AuthUser へ変換する", () => {
    expect(
      toAuthUser({
        discordUserId: "111",
        username: "user",
        globalName: "User",
        avatar: "av",
      }),
    ).toEqual({
      id: "111",
      username: "user",
      globalName: "User",
      avatar: "av",
    });
  });
});

describe("timingSafeCompare", () => {
  it("一致で true / 不一致で false", () => {
    expect(timingSafeCompare("abc", "abc")).toBe(true);
    expect(timingSafeCompare("abc", "abd")).toBe(false);
    expect(timingSafeCompare("abc", "abcd")).toBe(false);
  });
});

describe("getDiscordAccessToken", () => {
  it("refresh Cookie が無ければ null", async () => {
    const oauth = {
      refreshAccessToken: vi.fn(),
    } as unknown as DiscordOAuthService;
    const result = await getDiscordAccessToken(
      makeRequest({}),
      makeReply(),
      oauth,
    );
    expect(result).toBeNull();
  });

  it("refresh で access を取得し、ローテーション refresh を書き戻す", async () => {
    const oauth = {
      refreshAccessToken: vi
        .fn()
        .mockResolvedValue({ access_token: "AT", refresh_token: "NEW_RT" }),
    } as unknown as DiscordOAuthService;
    const request = makeRequest({ [REFRESH_COOKIE_NAME]: "OLD_RT" });
    const reply = makeReply();

    const access = await getDiscordAccessToken(request, reply, oauth);
    expect(access).toBe("AT");
    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      "NEW_RT",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("同一リクエスト内の 2 回目は stash を返し refresh を再呼び出ししない", async () => {
    const oauth = {
      refreshAccessToken: vi
        .fn()
        .mockResolvedValue({ access_token: "AT", refresh_token: "NEW_RT" }),
    } as unknown as DiscordOAuthService;
    const request = makeRequest({ [REFRESH_COOKIE_NAME]: "OLD_RT" });
    const reply = makeReply();

    await getDiscordAccessToken(request, reply, oauth);
    await getDiscordAccessToken(request, reply, oauth);
    expect(oauth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});

describe("resolveSession", () => {
  it("有効な JWT Cookie があればそのペイロードを返す", async () => {
    const token = await signSessionToken({
      discordUserId: "111",
      username: "user",
      globalName: "User",
      avatar: "av",
    });
    const oauth = {
      refreshAccessToken: vi.fn(),
    } as unknown as DiscordOAuthService;
    const session = await resolveSession(
      makeRequest({ [JWT_COOKIE_NAME]: token }),
      makeReply(),
      oauth,
    );
    expect(session?.discordUserId).toBe("111");
    expect(oauth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("JWT 無効でも refresh があれば透過リフレッシュして再発行する", async () => {
    const oauth = {
      refreshAccessToken: vi
        .fn()
        .mockResolvedValue({ access_token: "AT", refresh_token: "NEW_RT" }),
      fetchUser: vi.fn().mockResolvedValue(DISCORD_USER),
    } as unknown as DiscordOAuthService;
    const reply = makeReply();
    const session = await resolveSession(
      makeRequest({ [REFRESH_COOKIE_NAME]: "RT" }),
      reply,
      oauth,
    );
    expect(session?.discordUserId).toBe("111");
    // access JWT Cookie が再設定される
    expect(reply.setCookie).toHaveBeenCalledWith(
      JWT_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("Cookie が一切無ければ null", async () => {
    const oauth = {
      refreshAccessToken: vi.fn(),
    } as unknown as DiscordOAuthService;
    const session = await resolveSession(makeRequest({}), makeReply(), oauth);
    expect(session).toBeNull();
  });

  it("リフレッシュ失敗時は Cookie を消して null", async () => {
    const oauth = {
      refreshAccessToken: vi.fn().mockRejectedValue(new Error("invalid")),
    } as unknown as DiscordOAuthService;
    const reply = makeReply();
    const session = await resolveSession(
      makeRequest({ [REFRESH_COOKIE_NAME]: "RT" }),
      reply,
      oauth,
    );
    expect(session).toBeNull();
    expect(reply.clearCookie).toHaveBeenCalled();
  });
});
