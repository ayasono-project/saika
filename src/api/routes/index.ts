// src/api/routes/index.ts
// /api 配下のルーティングを集約するプラグイン

import type { FastifyPluginAsync } from "fastify";
import type { DiscordOAuthService } from "../auth/discordOAuthService";
import { authRoutes } from "../auth/routes";
import { API_INFO } from "../constants";
import type { ApiServerDeps } from "../types";

/** apiRoutes プラグインのオプション */
export interface ApiRoutesOptions {
  deps: ApiServerDeps;
  oauth: DiscordOAuthService;
}

/**
 * /api 配下のルートプラグイン。
 *
 * - /api/auth/* : 認証エンドポイント（パブリック）
 * - /api/        : メタ情報
 *
 * 機能別エンドポイント（/api/guilds/*）は後続ユニットでここに登録する。
 */
export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (
  fastify,
  opts,
) => {
  // 認証エンドポイント（セッション不要・パブリック）
  await fastify.register(authRoutes, {
    prefix: "/auth",
    oauth: opts.oauth,
  });

  // API メタ情報（疎通確認用）
  fastify.get("/", async () => {
    return { data: API_INFO };
  });
};
