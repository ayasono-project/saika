// src/api/auth/jwt.ts
// access JWT の署名・検証（jose・HMAC-SHA256・ステートレス）

import { jwtVerify, SignJWT } from "jose";
import { env } from "../../shared/config/env";
import { DEV_JWT_SECRET_FALLBACK, JWT_EXPIRY_SEC } from "./authConstants";

/** access JWT のペイロード（プロフィールを内包し /me で Discord を叩かずに応答できる） */
export interface SessionTokenPayload {
  /** Discord ユーザー ID */
  discordUserId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

/** HMAC-SHA256 */
const JWT_ALG = "HS256";

/** ミリ秒 → 秒 */
const MS_PER_SEC = 1000;

/** 署名鍵（本番は JWT_SECRET 必須・dev は固定鍵フォールバック） */
function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET ?? DEV_JWT_SECRET_FALLBACK);
}

/** セッションペイロードを 15 分有効の access JWT に署名する */
export async function signSessionToken(
  payload: SessionTokenPayload,
): Promise<string> {
  const nowSec = Math.floor(Date.now() / MS_PER_SEC);
  return new SignJWT({
    discordUserId: payload.discordUserId,
    username: payload.username,
    globalName: payload.globalName,
    avatar: payload.avatar,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + JWT_EXPIRY_SEC)
    .sign(secretKey());
}

/**
 * access JWT を検証してペイロードを返す。
 * 署名不正・期限切れ・形式不正の場合は例外を投げる。
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: [JWT_ALG],
  });
  return {
    discordUserId: String(payload.discordUserId),
    username: String(payload.username),
    globalName: (payload.globalName as string | null) ?? null,
    avatar: (payload.avatar as string | null) ?? null,
  };
}
