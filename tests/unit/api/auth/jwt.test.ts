// tests/unit/api/auth/jwt.test.ts
// セッション JWT 検証（jose）のユニットテスト。署名・発行は web BFF が担当するため検証のみ。

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { DEV_JWT_SECRET_FALLBACK } from "@/api/auth/authConstants";
import type { SessionClaims } from "@/api/auth/jwt";
import { verifySessionToken } from "@/api/auth/jwt";
import { env } from "@/shared/config/env";

// 検証側（verifySessionToken）と同じ鍵で署名する（ローカル .env の JWT_SECRET に依存しない）
const KEY = new TextEncoder().encode(env.JWT_SECRET ?? DEV_JWT_SECRET_FALLBACK);

/** dev フォールバック鍵で 15 分有効のトークンを署名する（web BFF の発行を模す） */
async function sign(claims: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 900)
    .sign(KEY);
}

const CLAIMS: SessionClaims = {
  discordUserId: "123456789012345678",
  username: "saika_admin",
  globalName: "Saika Admin",
  avatar: "abc123",
  guilds: ["g1", "g2"],
};

describe("verifySessionToken", () => {
  it("有効なトークンを検証してクレームを返す", async () => {
    const decoded = await verifySessionToken(await sign({ ...CLAIMS }));
    expect(decoded).toEqual(CLAIMS);
  });

  it("globalName / avatar が null でも保持される", async () => {
    const decoded = await verifySessionToken(
      await sign({
        discordUserId: "1",
        username: "u",
        globalName: null,
        avatar: null,
        guilds: [],
      }),
    );
    expect(decoded.globalName).toBeNull();
    expect(decoded.avatar).toBeNull();
    expect(decoded.guilds).toEqual([]);
  });

  it("guilds クレームが欠落していれば空配列にフォールバックする", async () => {
    const decoded = await verifySessionToken(
      await sign({ discordUserId: "1", username: "u" }),
    );
    expect(decoded.guilds).toEqual([]);
  });

  it("不正な文字列は検証で例外を投げる", async () => {
    await expect(verifySessionToken("not-a-jwt")).rejects.toThrow();
  });

  it("改ざんされたトークンは検証で例外を投げる", async () => {
    const token = await sign({ ...CLAIMS });
    await expect(
      verifySessionToken(`${token.slice(0, -3)}xyz`),
    ).rejects.toThrow();
  });

  it("期限切れトークンは検証で例外を投げる", async () => {
    const expired = await new SignJWT({ discordUserId: "1", username: "u" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(1000)
      .setExpirationTime(2000)
      .sign(KEY);
    await expect(verifySessionToken(expired)).rejects.toThrow();
  });
});
