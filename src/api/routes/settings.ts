// src/api/routes/settings.ts
// 機能別設定エンドポイント（/api/guilds/:guildId/<feature>）

import type { FastifyPluginAsync } from "fastify";
import { createAfkResource } from "../features/afkResource";
import { createBumpResource } from "../features/bumpResource";
import { createConfigResource } from "../features/configResource";
import { createMemberLogResource } from "../features/memberLogResource";
import { createVacResource, listActiveVacs } from "../features/vacResource";
import { getGuildId } from "../lib/request";
import type { ApiServerDeps } from "../types";
import { registerSettingsResource } from "./settingsResource";

/** settingsRoutes プラグインのオプション */
export interface SettingsRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * 機能別設定ルートプラグイン（/api/guilds 配下に同居）。
 * 各機能の GET/PATCH/POST-reset を共通ファクトリで登録する。
 */
export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { deps } = opts;

  registerSettingsResource(fastify, createConfigResource(deps.prisma));
  registerSettingsResource(fastify, createAfkResource());
  registerSettingsResource(fastify, createVacResource());
  registerSettingsResource(fastify, createMemberLogResource(deps.prisma));
  registerSettingsResource(fastify, createBumpResource());

  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // VAC が作成・追跡中の VC 一覧（読み取り専用）
  fastify.get("/:guildId/vac/active", guarded, async (request) => {
    return { data: await listActiveVacs(deps.client, getGuildId(request)) };
  });
};
