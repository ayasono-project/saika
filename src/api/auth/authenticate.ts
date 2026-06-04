// src/api/auth/authenticate.ts
// JWT セッションを検証する preHandler（保護ルートに適用）

import type { FastifyReply, FastifyRequest } from "fastify";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import type { DiscordOAuthService } from "./discordOAuthService";
import { resolveSession } from "./session";

/**
 * 認証 preHandler を生成する。
 * セッションを解決し、未認証なら 401 を投げる。通過時は request.authUser を付与する。
 */
export function createAuthenticate(
  oauth: DiscordOAuthService,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    const session = await resolveSession(request, reply, oauth);
    if (!session) {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }
    request.authUser = session;
  };
}
