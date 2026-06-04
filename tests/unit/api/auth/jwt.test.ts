// tests/unit/api/auth/jwt.test.ts
// access JWT 署名・検証（jose）のユニットテスト

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import type { SessionTokenPayload } from "@/api/auth/jwt";
import { signSessionToken, verifySessionToken } from "@/api/auth/jwt";

const PAYLOAD: SessionTokenPayload = {
  discordUserId: "123456789012345678",
  username: "saika_admin",
  globalName: "Saika Admin",
  avatar: "abc123",
};

describe("signSessionToken / verifySessionToken", () => {
  it("署名 → 検証でペイロードがラウンドトリップする", async () => {
    const token = await signSessionToken(PAYLOAD);
    const decoded = await verifySessionToken(token);
    expect(decoded).toEqual(PAYLOAD);
  });

  it("globalName / avatar が null でも保持される", async () => {
    const p: SessionTokenPayload = {
      discordUserId: "1",
      username: "u",
      globalName: null,
      avatar: null,
    };
    const decoded = await verifySessionToken(await signSessionToken(p));
    expect(decoded.globalName).toBeNull();
    expect(decoded.avatar).toBeNull();
  });

  it("不正な文字列は検証で例外を投げる", async () => {
    await expect(verifySessionToken("not-a-jwt")).rejects.toThrow();
  });

  it("改ざんされたトークンは検証で例外を投げる", async () => {
    const token = await signSessionToken(PAYLOAD);
    const tampered = `${token.slice(0, -3)}xyz`;
    await expect(verifySessionToken(tampered)).rejects.toThrow();
  });

  it("期限切れトークンは検証で例外を投げる", async () => {
    // 過去の exp を持つトークンを直接生成（dev フォールバック鍵で署名）
    const key = new TextEncoder().encode(
      "dev-insecure-jwt-secret-do-not-use-in-prod",
    );
    const expired = await new SignJWT({ discordUserId: "1", username: "u" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(1000)
      .setExpirationTime(2000)
      .sign(key);
    await expect(verifySessionToken(expired)).rejects.toThrow();
  });
});
