// src/api/routes/guilds.ts
// ギルド/Discord リソースエンドポイント（/api/guilds 配下）

import type { Channel as ContractChannel } from "@ayasono/shared/api";
import type { Guild as DiscordGuild } from "discord.js";
import type { FastifyPluginAsync } from "fastify";
import type { BotClient } from "../../bot/client";
import { tDefault } from "../../shared/locale/localeManager";
import type { DiscordOAuthService } from "../auth/discordOAuthService";
import {
  type GuildAccessCache,
  getUserGuilds,
  hasManageGuild,
} from "../auth/guildAccess";
import {
  mapChannel,
  mapGuildSummary,
  mapMember,
  mapRole,
} from "../lib/discordMappers";
import { ApiHttpError } from "../lib/httpError";
import type { ApiServerDeps } from "../types";

/** guildRoutes プラグインのオプション */
export interface GuildRoutesOptions {
  deps: ApiServerDeps;
  oauth: DiscordOAuthService;
  guildCache: GuildAccessCache;
}

/**
 * 検証済み guildId に対応する Bot 参加済みギルドを取得する。
 * requireGuildAccess はユーザーの権限を検証するが Bot 参加までは保証しないため、
 * Bot がギルドにいなければ 404 を返す。
 */
function requireBotGuild(
  client: BotClient,
  guildId: string | undefined,
): DiscordGuild {
  const guild = guildId ? client.guilds.cache.get(guildId) : undefined;
  if (!guild) {
    throw ApiHttpError.notFound(tDefault("system:web.bot_not_in_guild"));
  }
  return guild;
}

/**
 * ギルド/Discord リソースのルートプラグイン。
 * - GET /            : 管理可能なギルド一覧（authenticate のみ）
 * - GET /:guildId/*  : チャンネル/ロール/メンバー（authenticate + requireGuildAccess）
 */
export const guildRoutes: FastifyPluginAsync<GuildRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { client } = opts.deps;
  const { oauth, guildCache } = opts;

  // 管理可能なギルド一覧（ManageGuild/オーナー権限のあるギルド）
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const userId = request.authUser?.discordUserId;
      if (!userId) {
        throw ApiHttpError.unauthorized(
          tDefault("system:web.auth_session_required"),
        );
      }
      const guilds = await getUserGuilds(
        userId,
        request,
        reply,
        oauth,
        guildCache,
      );
      const data = guilds
        .filter((g) => hasManageGuild(g))
        .map((g) => mapGuildSummary(g, client.guilds.cache.get(g.id)));
      return { data };
    },
  );

  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // チャンネル一覧（text/voice/category のみ）
  fastify.get("/:guildId/channels", guarded, async (request) => {
    const guild = requireBotGuild(client, request.guildId);
    const data = [...guild.channels.cache.values()]
      .map(mapChannel)
      .filter((c): c is ContractChannel => c !== null);
    return { data };
  });

  // ロール一覧（@everyone を除外し、位置の高い順）
  fastify.get("/:guildId/roles", guarded, async (request) => {
    const guild = requireBotGuild(client, request.guildId);
    const data = [...guild.roles.cache.values()]
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(mapRole);
    return { data };
  });

  // メンバー一覧（キャッシュ済みメンバー）
  fastify.get("/:guildId/members", guarded, async (request) => {
    const guild = requireBotGuild(client, request.guildId);
    const data = [...guild.members.cache.values()].map(mapMember);
    return { data };
  });
};
