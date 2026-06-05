// src/api/routes/index.ts
// /api 配下のルーティングを集約するプラグイン

import type { FastifyPluginAsync } from "fastify";
import { API_INFO } from "../constants";
import type { ApiServerDeps } from "../types";
import { guildRoutes } from "./guilds";
import { reactionRoleRoutes } from "./reactionRoles";
import { settingsRoutes } from "./settings";
import { stickyRoutes } from "./sticky";
import { ticketRoutes } from "./tickets";

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

  // メッセージ固定（sticky）のコレクション CRUD
  await fastify.register(stickyRoutes, {
    prefix: "/guilds",
    deps: opts.deps,
  });

  // リアクションロールパネルのコレクション CRUD
  await fastify.register(reactionRoleRoutes, {
    prefix: "/guilds",
    deps: opts.deps,
  });

  // チケットパネルのコレクション CRUD
  await fastify.register(ticketRoutes, {
    prefix: "/guilds",
    deps: opts.deps,
  });

  // API メタ情報（疎通確認用）
  fastify.get("/", async () => {
    return { data: API_INFO };
  });
};
