// src/api/auth/session.ts
// セッション表現（JWT ペイロード・Cookie 管理・透過リフレッシュ・access トークン取得）

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthUser } from "@ayasono/shared/api";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env, NODE_ENV } from "../../shared/config/env";
import {
  JWT_COOKIE_NAME,
  OAUTH_STATE_BYTES,
  OAUTH_STATE_COOKIE_MAX_AGE_SEC,
  OAUTH_STATE_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_SEC,
  REFRESH_COOKIE_NAME,
} from "./authConstants";
import type { DiscordOAuthService, DiscordUser } from "./discordOAuthService";
import {
  type SessionTokenPayload,
  signSessionToken,
  verifySessionToken,
} from "./jwt";

export type { SessionTokenPayload } from "./jwt";

/** 認証済みリクエストに付与するセッション情報 */
export type AuthSession = SessionTokenPayload;

// Fastify インスタンス・リクエストの拡張（認証デコレータ・コンテキスト）
declare module "fastify" {
  interface FastifyInstance {
    /** JWT を検証し未認証なら 401 を投げる preHandler */
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    /** :guildId への ManageGuild 権限を検証する preHandler */
    requireGuildAccess: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    /** authenticate 通過後のセッション */
    authUser?: AuthSession;
    /** requireGuildAccess 通過後の検証済みギルド ID */
    guildId?: string;
    /**
     * 当該リクエスト内で取得した Discord アクセストークンの一時保持。
     * refresh_token はローテーションされるため、1 リクエスト内で複数回 refresh して
     * 旧トークンを無効化しないよう、最初の取得結果をここで共有する。
     */
    discordAccess?: string;
  }
}

/** Discord ユーザーをセッションペイロードへ変換する */
export function toSessionPayload(user: DiscordUser): SessionTokenPayload {
  return {
    discordUserId: user.id,
    username: user.username,
    globalName: user.global_name,
    avatar: user.avatar,
  };
}

/** セッションを API 契約の AuthUser へ変換する */
export function toAuthUser(session: SessionTokenPayload): AuthUser {
  return {
    id: session.discordUserId,
    username: session.username,
    globalName: session.globalName,
    avatar: session.avatar,
  };
}

/** 認証 Cookie 共通の属性（本番のみ secure・サブドメイン共有用 domain） */
function baseCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  domain?: string;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === NODE_ENV.PRODUCTION,
    sameSite: "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/** access JWT を署名して Cookie に設定する */
export async function setJwtCookie(
  reply: FastifyReply,
  session: SessionTokenPayload,
): Promise<void> {
  const token = await signSessionToken(session);
  reply.setCookie(JWT_COOKIE_NAME, token, baseCookieOptions());
}

/** refresh トークンを Cookie に設定する（ローテーション時の更新にも使用） */
export function setRefreshCookie(
  reply: FastifyReply,
  refreshToken: string,
): void {
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_SEC,
  });
}

/** ログイン確立時に access JWT と refresh の両 Cookie を設定する */
export async function issueSession(
  reply: FastifyReply,
  session: SessionTokenPayload,
  refreshToken: string,
): Promise<void> {
  await setJwtCookie(reply, session);
  setRefreshCookie(reply, refreshToken);
}

/** 認証 Cookie（access JWT・refresh）を削除する */
export function clearAuthCookies(reply: FastifyReply): void {
  const opts = baseCookieOptions();
  reply.clearCookie(JWT_COOKIE_NAME, opts);
  reply.clearCookie(REFRESH_COOKIE_NAME, opts);
}

/** OAuth2 state Cookie を発行し、生成した state を返す */
export function issueOAuthState(reply: FastifyReply): string {
  const state = randomBytes(OAUTH_STATE_BYTES).toString("hex");
  reply.setCookie(OAUTH_STATE_COOKIE_NAME, state, {
    ...baseCookieOptions(),
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_SEC,
  });
  return state;
}

/** OAuth2 state Cookie を削除する */
export function clearOAuthState(reply: FastifyReply): void {
  reply.clearCookie(OAUTH_STATE_COOKIE_NAME, baseCookieOptions());
}

/**
 * 2 つの state をタイミングセーフに比較する。
 * 入力長に依存しないよう SHA-256 ハッシュ化してから固定長で比較する。
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * 当該リクエストで利用する Discord アクセストークンを取得する。
 *
 * 1 リクエスト内で初回のみ refresh_token を消費してアクセストークンを取得し、
 * ローテーションされた refresh は Cookie に書き戻す。2 回目以降は stash を再利用し、
 * 同一リクエスト内での二重 refresh（旧トークン無効化）を防ぐ。
 *
 * @returns アクセストークン、refresh Cookie が無ければ null
 */
export async function getDiscordAccessToken(
  request: FastifyRequest,
  reply: FastifyReply,
  oauth: DiscordOAuthService,
): Promise<string | null> {
  if (request.discordAccess) return request.discordAccess;

  const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) return null;

  const tokens = await oauth.refreshAccessToken(refreshToken);
  request.discordAccess = tokens.access_token;
  // refresh はローテーションされるため必ず書き戻す
  setRefreshCookie(reply, tokens.refresh_token);
  return tokens.access_token;
}

/**
 * リクエストからセッションを解決する。
 *
 * 1. access JWT Cookie が有効 → そのペイロードを返す
 * 2. 期限切れ/欠落だが refresh Cookie があれば Discord で再交換し、JWT を再発行
 * 3. いずれも不可なら Cookie を消して null
 *
 * @returns 認証済みセッション、または未認証なら null
 */
export async function resolveSession(
  request: FastifyRequest,
  reply: FastifyReply,
  oauth: DiscordOAuthService,
): Promise<AuthSession | null> {
  const jwtCookie = request.cookies[JWT_COOKIE_NAME];
  if (jwtCookie) {
    try {
      // ayasono_session Cookie の access JWT を検証
      return await verifySessionToken(jwtCookie);
    } catch {
      // 期限切れ/不正 → リフレッシュを試行
    }
  }

  try {
    const access = await getDiscordAccessToken(request, reply, oauth);
    if (!access) return null;
    const user = await oauth.fetchUser(access);
    const session = toSessionPayload(user);
    await setJwtCookie(reply, session);
    return session;
  } catch {
    clearAuthCookies(reply);
    return null;
  }
}
