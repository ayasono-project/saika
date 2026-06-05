// src/api/routes/index.ts
// /api 配下のルーティングを集約するプラグイン

import type { FastifyPluginAsync } from "fastify";
import { API_INFO } from "../constants";
import type { ApiServerDeps } from "../types";
import { guildRoutes } from "./guilds";
import { settingsRoutes } from "./settings";

/** apiRoutes プラグインのオプション */
export interface ApiRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * /api 配下のルートプラグイン。
 *
 * - /api/guilds/:guildId/* : ギルド/Discord リソース・機能別設定（要認証）
 * - /api/                  : メタ情報
 *
 * 認証エンドポイント（/api/auth/*）は web BFF が担当するため saika には無い。
 */
export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (
  fastify,
  opts,
) => {
  // ギルド/Discord リソース（authenticate / requireGuildAccess で保護）
  await fastify.register(guildRoutes, {
    prefix: "/guilds",
    deps: opts.deps,
  });

  // 機能別設定（/guilds 配下に同居）
  await fastify.register(settingsRoutes, {
    prefix: "/guilds",
    deps: opts.deps,
  });

  // API メタ情報（疎通確認用）
  fastify.get("/", async () => {
    return { data: API_INFO };
  });
};
