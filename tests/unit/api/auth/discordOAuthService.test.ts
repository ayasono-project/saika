// tests/unit/api/auth/discordOAuthService.test.ts
// Discord OAuth2 サービス（fetch ベース）のユニットテスト

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordOAuthService } from "@/api/auth/discordOAuthService";

const CONFIG = {
  clientId: "app-id",
  clientSecret: "secret",
  redirectUri: "https://api.example.com/api/auth/callback",
};

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => data,
  } as unknown as Response;
}

describe("DiscordOAuthService", () => {
  let service: DiscordOAuthService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new DiscordOAuthService(CONFIG);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("buildAuthorizeUrl が必要なパラメータを含む", () => {
    const url = service.buildAuthorizeUrl("state-xyz");
    expect(url).toContain("https://discord.com/api/oauth2/authorize?");
    expect(url).toContain("client_id=app-id");
    expect(url).toContain("state=state-xyz");
    expect(url).toContain("scope=identify+guilds");
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fapi.example.com%2Fapi%2Fauth%2Fcallback",
    );
  });

  it("exchangeCode は token エンドポイントを叩いてトークンを返す", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: "at", refresh_token: "rt", expires_in: 1 }),
    );
    const tokens = await service.exchangeCode("the-code");
    expect(tokens.access_token).toBe("at");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.com/api/oauth2/token");
    expect((init.body as URLSearchParams).get("grant_type")).toBe(
      "authorization_code",
    );
    expect((init.body as URLSearchParams).get("code")).toBe("the-code");
  });

  it("exchangeCode は失敗時に DiscordApiError を投げる", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 400));
    await expect(service.exchangeCode("bad")).rejects.toThrow();
  });

  it("refreshAccessToken は grant_type=refresh_token で交換する", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        access_token: "at2",
        refresh_token: "rt2",
        expires_in: 1,
      }),
    );
    const tokens = await service.refreshAccessToken("old-rt");
    expect(tokens.refresh_token).toBe("rt2");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.body as URLSearchParams).get("grant_type")).toBe(
      "refresh_token",
    );
  });

  it("fetchUser は Bearer 認証でユーザーを返す", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: "1", username: "u", global_name: null, avatar: null }),
    );
    const user = await service.fetchUser("access");
    expect(user.id).toBe("1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.com/api/users/@me");
    expect(init.headers.Authorization).toBe("Bearer access");
  });

  it("fetchUserGuilds はギルド配列を返す", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ id: "g1", name: "G", owner: true, permissions: "0" }]),
    );
    const guilds = await service.fetchUserGuilds("access");
    expect(guilds).toHaveLength(1);
    expect(guilds[0].id).toBe("g1");
  });

  it("fetchUserGuilds は失敗時に例外を投げる", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401));
    await expect(service.fetchUserGuilds("access")).rejects.toThrow();
  });

  it("revokeToken はネットワークエラーを握りつぶす（best-effort）", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    await expect(service.revokeToken("tok")).resolves.toBeUndefined();
  });
});
