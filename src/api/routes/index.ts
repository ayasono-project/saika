// src/api/routes/index.ts
// /api 配下のルーティングを集約するプラグイン

import type { FastifyPluginAsync } from "fastify";
import { API_INFO } from "../constants";
import type { ApiServerDeps } from "../types";

/** apiRoutes プラグインのオプション */
export interface ApiRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * /api 配下のルートプラグイン。
 *
 * Unit1 ではメタ情報エンドポイントのみを提供する。
 * 認証（auth/*）・機能別エンドポイントは後続ユニットでここに登録する。
 */
export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (
  fastify,
) => {
  // API メタ情報（疎通確認用）
  fastify.get("/", async () => {
    return { data: API_INFO };
  });
};
