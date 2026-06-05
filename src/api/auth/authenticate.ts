// src/api/auth/authenticate.ts
// セッション JWT を検証する preHandler（保護ルートに適用）。
// web BFF が発行した Cookie の JWT を検証するのみで、Discord・refresh には触れない。

import type { FastifyReply, FastifyRequest } from "fastify";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import { JWT_COOKIE_NAME } from "./authConstants";
import type { SessionClaims } from "./jwt";
import { verifySessionToken } from "./jwt";

// Fastify インスタンス・リクエストの拡張（認証デコレータ・コンテキスト）
declare module "fastify" {
  interface FastifyInstance {
    /** セッション JWT を検証し未認証なら 401 を投げる preHandler */
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    /** :guildId への管理アクセスを検証する preHandler */
    requireGuildAccess: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    /** authenticate 通過後のセッションクレーム */
    authUser?: SessionClaims;
    /** requireGuildAccess 通過後の検証済みギルド ID */
    guildId?: string;
  }
}

/**
 * 認証 preHandler を生成する。
 *
 * Cookie のセッション JWT を検証し、成功時は request.authUser にクレームを付与する。
 * 欠落・検証失敗はいずれも 401（refresh は web BFF が担当するため saika では行わない）。
 */
export function createAuthenticate(): (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> {
  return async (request) => {
    const token = request.cookies[JWT_COOKIE_NAME];
    if (!token) {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }
    try {
      request.authUser = await verifySessionToken(token);
    } catch {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }
  };
}
