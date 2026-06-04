// src/api/auth/routes.ts
// 認証エンドポイント（/api/auth/*）— Discord OAuth2 ログイン・コールバック・me・logout・refresh

import type { FastifyPluginAsync } from "fastify";
import { env } from "../../shared/config/env";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { ApiHttpError } from "../lib/httpError";
import { OAUTH_STATE_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./authConstants";
import type { DiscordOAuthService } from "./discordOAuthService";
import {
  clearAuthCookies,
  clearOAuthState,
  issueOAuthState,
  issueSession,
  resolveSession,
  timingSafeCompare,
  toAuthUser,
  toSessionPayload,
} from "./session";

/** authRoutes プラグインのオプション */
export interface AuthRoutesOptions {
  oauth: DiscordOAuthService;
}

/** web フロントエンドのログイン画面 URL（エラーコード付き）を組み立てる */
function loginErrorUrl(error: string): string {
  return `${env.WEB_BASE_URL}/login?error=${error}`;
}

/**
 * 認証ルートプラグイン。
 * login/callback はブラウザの全ページ遷移（302）、me/logout/refresh は JSON を返す。
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { oauth } = opts;

  // ① ログイン開始: state を発行して Discord 認可画面へ 302
  fastify.get("/login", async (_request, reply) => {
    const state = issueOAuthState(reply);
    return reply.redirect(oauth.buildAuthorizeUrl(state));
  });

  // ④ コールバック: state 検証 → トークン交換 → JWT 発行 → /servers へ 302
  fastify.get("/callback", async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (query.error) {
      logger.info(
        logPrefixed("system:log_prefix.web", "system:web.oauth_denied", {
          error: query.error,
        }),
      );
      return reply.redirect(loginErrorUrl("access_denied"));
    }
    if (!query.code || !query.state) {
      return reply.redirect(loginErrorUrl("invalid_request"));
    }

    const stateCookie = request.cookies[OAUTH_STATE_COOKIE_NAME];
    if (!stateCookie || !timingSafeCompare(stateCookie, query.state)) {
      logger.warn(
        logPrefixed("system:log_prefix.web", "system:web.oauth_state_mismatch"),
      );
      return reply.redirect(loginErrorUrl("invalid_state"));
    }

    try {
      const tokens = await oauth.exchangeCode(query.code);
      const user = await oauth.fetchUser(tokens.access_token);
      const session = toSessionPayload(user);
      await issueSession(reply, session, tokens.refresh_token);
      clearOAuthState(reply);
      logger.info(
        logPrefixed("system:log_prefix.web", "system:web.oauth_login_success", {
          userId: user.id,
          username: user.username,
        }),
      );
      return reply.redirect(`${env.WEB_BASE_URL}/servers`);
    } catch (error) {
      logger.warn(
        logPrefixed("system:log_prefix.web", "system:web.oauth_callback_error"),
        error,
      );
      return reply.redirect(loginErrorUrl("callback_failed"));
    }
  });

  // ログインユーザー情報（期限切れ時は透過リフレッシュ）
  fastify.get("/me", async (request, reply) => {
    const session = await resolveSession(request, reply, oauth);
    if (!session) {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }
    return { data: toAuthUser(session) };
  });

  // ログアウト: Discord トークン失効（best-effort）+ Cookie 削除
  fastify.post("/logout", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await oauth.revokeToken(refreshToken);
    }
    clearAuthCookies(reply);
    return { data: { success: true } };
  });

  // トークンリフレッシュ（フロントは通常透過に頼るが、契約として明示エンドポイントも用意）
  fastify.post("/refresh", async (request, reply) => {
    const session = await resolveSession(request, reply, oauth);
    if (!session) {
      clearAuthCookies(reply);
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_expired"),
      );
    }
    return { data: toAuthUser(session) };
  });
};
