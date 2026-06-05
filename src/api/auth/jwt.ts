// src/api/auth/jwt.ts
// セッション JWT の検証（jose・HMAC-SHA256・ステートレス）。
// 署名・発行・refresh は web BFF が担当し、各 Bot API（saika）は検証のみ行う。

import { jwtVerify } from "jose";
import { env } from "../../shared/config/env";
import { DEV_JWT_SECRET_FALLBACK } from "./authConstants";

/**
 * セッション JWT のクレーム。
 * web BFF がログイン時に発行し、ユーザーが管理可能（ManageGuild/オーナー）な
 * ギルド ID 一覧を `guilds` に埋め込む。saika はこれを検証してアクセス制御に使う。
 */
export interface SessionClaims {
  /** Discord ユーザー ID */
  discordUserId: string;
  username: string;
  globalName: string | null;
  /** アバターハッシュ（未設定で null） */
  avatar: string | null;
  /** ユーザーが管理可能なギルド ID 一覧 */
  guilds: string[];
}

/** HMAC-SHA256 */
const JWT_ALG = "HS256";

/** 署名鍵（本番は JWT_SECRET 必須・dev は固定鍵フォールバック・web BFF と共有） */
function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET ?? DEV_JWT_SECRET_FALLBACK);
}

/**
 * セッション JWT を検証してクレームを返す。
 * 署名不正・期限切れ・形式不正の場合は例外を投げる。
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: [JWT_ALG],
  });
  return {
    discordUserId: String(payload.discordUserId),
    username: String(payload.username),
    globalName: (payload.globalName as string | null) ?? null,
    avatar: (payload.avatar as string | null) ?? null,
    guilds: Array.isArray(payload.guilds) ? payload.guilds.map(String) : [],
  };
}
