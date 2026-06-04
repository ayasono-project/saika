// src/api/routes/settingsResource.ts
// 設定リソース（GET/PATCH/POST-reset）の共通ルート登録ファクトリ

import type { FastifyInstance } from "fastify";
import { getGuildId } from "../lib/request";

/**
 * 単一オブジェクト型の設定リソース。
 * read/patch/reset を提供すれば GET/PATCH/POST-reset の3ルートが生える。
 */
export interface SettingsResource<T> {
  /** ルートパス（例: "afk" → /:guildId/afk） */
  path: string;
  /** 現在の設定を返す（未設定はデフォルト） */
  read(guildId: string): Promise<T>;
  /** 部分更新を適用して更新後の設定を返す */
  patch(guildId: string, body: Partial<T>): Promise<T>;
  /** デフォルトへリセットして返す */
  reset(guildId: string): Promise<T>;
}

/**
 * 設定リソースの GET/PATCH/POST-reset ルートを登録する。
 * すべて authenticate + requireGuildAccess で保護される。
 */
export function registerSettingsResource<T>(
  fastify: FastifyInstance,
  resource: SettingsResource<T>,
): void {
  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  fastify.get(`/:guildId/${resource.path}`, guarded, async (request) => {
    return { data: await resource.read(getGuildId(request)) };
  });

  fastify.patch(`/:guildId/${resource.path}`, guarded, async (request) => {
    return {
      data: await resource.patch(
        getGuildId(request),
        request.body as Partial<T>,
      ),
    };
  });

  fastify.post(`/:guildId/${resource.path}/reset`, guarded, async (request) => {
    return { data: await resource.reset(getGuildId(request)) };
  });
}
