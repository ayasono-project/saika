// src/api/routes/settings.ts
// 機能別設定エンドポイント（/api/guilds/:guildId/<feature>）

import type { FastifyPluginAsync } from "fastify";
import { createAfkResource } from "../features/afkResource";
import { createBumpResource } from "../features/bumpResource";
import { createConfigResource } from "../features/configResource";
import { createInactiveKickResource } from "../features/inactiveKickResource";
import { createMemberLogResource } from "../features/memberLogResource";
import { createUnverifiedKickResource } from "../features/unverifiedKickResource";
import { createVacResource, listActiveVacs } from "../features/vacResource";
import {
  createVcAutoRecruitResource,
  listActiveInvites,
} from "../features/vcAutoRecruitResource";
import { createVcRecruitResource } from "../features/vcRecruitResource";
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
  registerSettingsResource(fastify, createVcAutoRecruitResource(deps.prisma));
  registerSettingsResource(fastify, createInactiveKickResource(deps.prisma));
  registerSettingsResource(fastify, createUnverifiedKickResource(deps.prisma));
  registerSettingsResource(fastify, createVcRecruitResource(deps));

  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // VAC が作成・追跡中の VC 一覧（読み取り専用）
  fastify.get("/:guildId/vac/active", guarded, async (request) => {
    return { data: await listActiveVacs(deps.client, getGuildId(request)) };
  });

  // VC自動募集が投稿中の募集一覧（読み取り専用）
  fastify.get("/:guildId/vc-auto-recruit/active", guarded, async (request) => {
    return { data: await listActiveInvites(deps.client, getGuildId(request)) };
  });
};
