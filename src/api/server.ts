// src/api/server.ts
// web ダッシュボード向け Fastify API サーバー（Bot と同一プロセスで起動）

import { ConfigurationError } from "@ayasono/shared/core";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { env, NODE_ENV } from "../shared/config/env";
import { logPrefixed, tDefault } from "../shared/locale/localeManager";
import { logger } from "../shared/utils/logger";
import { createAuthenticate } from "./auth/authenticate";
import { DiscordOAuthService } from "./auth/discordOAuthService";
import { createRequireGuildAccess, GuildAccessCache } from "./auth/guildAccess";
import { RATE_LIMIT } from "./constants";
import { toErrorResponse } from "./lib/httpError";
import { apiRoutes } from "./routes/index";
import type { ApiServerDeps } from "./types";

/** /ready で 503 を返す HTTP ステータス */
const SERVICE_UNAVAILABLE = 503;
const HTTP_NOT_FOUND = 404;

/** env から Discord OAuth サービスを構築する */
function createOAuthService(): DiscordOAuthService {
  return new DiscordOAuthService({
    clientId: env.DISCORD_APP_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
    redirectUri: `${env.API_PUBLIC_URL}/api/auth/callback`,
  });
}

/**
 * 本番環境で必須の認証関連シークレットが設定されているか検証する。
 * 未設定なら起動を中断する（不正設定での公開を防ぐ）。
 */
function assertProductionConfig(): void {
  if (env.NODE_ENV !== NODE_ENV.PRODUCTION) return;
  const missing: string[] = [];
  if (!env.DISCORD_CLIENT_SECRET) missing.push("DISCORD_CLIENT_SECRET");
  if (!env.JWT_SECRET) missing.push("JWT_SECRET");
  if (missing.length > 0) {
    throw new ConfigurationError(
      `API requires environment variables in production: ${missing.join(", ")}`,
    );
  }
}

/**
 * 依存（DB・Discord クライアント）の準備状況を確認する。
 * @returns DB 疎通かつ Discord クライアントが ready なら true
 */
async function checkReady(deps: ApiServerDeps): Promise<boolean> {
  try {
    await deps.prisma.$queryRaw`SELECT 1`;
    return deps.client.isReady();
  } catch {
    return false;
  }
}

/**
 * Fastify アプリ本体を構築して返す（listen はしない）。
 * テストでは `app.inject()` でこのインスタンスを直接叩ける。
 *
 * @param deps Discord クライアントと Prisma を注入
 */
export async function buildApiServer(
  deps: ApiServerDeps,
): Promise<FastifyInstance> {
  // ロギングは winston に一本化するため Fastify 内蔵 logger は無効化。
  // Cloudflare/Coolify のリバースプロキシ配下のため trustProxy を有効化。
  const app = Fastify({ logger: false, trustProxy: true });

  // Cookie（認証 state / access JWT / refresh の格納に使用）
  await app.register(cookie);

  // CORS: web ダッシュボードの配信元のみ許可し、Cookie 送信を有効化
  await app.register(cors, {
    origin: env.WEB_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  // グローバルレート制限
  await app.register(rateLimit, {
    max: RATE_LIMIT.max,
    timeWindow: RATE_LIMIT.timeWindow,
  });

  // 認証層: OAuth サービス・ギルドキャッシュを構築し、preHandler をデコレート。
  // デコレータは子プラグイン（apiRoutes 配下の機能ルート）から参照される。
  const oauth = createOAuthService();
  const guildCache = new GuildAccessCache();
  app.decorate("authenticate", createAuthenticate(oauth));
  app.decorate(
    "requireGuildAccess",
    createRequireGuildAccess(oauth, guildCache),
  );

  // 例外 → エラー封筒への一元変換
  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(
      error,
      tDefault("system:web.internal_server_error"),
    );
    // バグの可能性があるものだけ error レベルで記録
    if (mapped.isUnexpected) {
      logger.error(
        logPrefixed("system:log_prefix.web", "system:web.api_error"),
        error,
      );
    }
    reply.status(mapped.status).send(mapped.body);
  });

  // 未定義ルートは契約準拠の NOT_FOUND 封筒で返す
  app.setNotFoundHandler((_request, reply) => {
    reply.status(HTTP_NOT_FOUND).send({
      error: {
        code: "NOT_FOUND",
        message: tDefault("system:web.not_found_route"),
      },
    });
  });

  // ヘルスチェック（liveness・依存に触れない）
  app.get("/health", async () => ({ status: "ok" }));

  // レディネスチェック（DB 疎通 + Discord クライアント ready）
  app.get("/ready", async (_request, reply) => {
    if (!(await checkReady(deps))) {
      reply.status(SERVICE_UNAVAILABLE).send({
        error: {
          code: "INTERNAL_ERROR",
          message: tDefault("system:web.not_ready"),
        },
      });
      return;
    }
    return { status: "ready" };
  });

  // /api 配下の機能ルート（認証・ギルドリソースを含む）
  await app.register(apiRoutes, { prefix: "/api", deps, oauth, guildCache });

  return app;
}

/**
 * API サーバーを構築して listen し、起動ログを出力する。
 * 起動失敗時は例外を呼び出し元（main.ts）へ伝播させる。
 *
 * @param deps Discord クライアントと Prisma を注入
 * @returns listen 済みの Fastify インスタンス（シャットダウン時に close する）
 */
export async function startApiServer(
  deps: ApiServerDeps,
): Promise<FastifyInstance> {
  assertProductionConfig();
  const app = await buildApiServer(deps);
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  logger.info(
    logPrefixed("system:log_prefix.web", "system:web.server_started", {
      url: `http://${env.API_HOST}:${env.API_PORT}`,
    }),
  );
  return app;
}
