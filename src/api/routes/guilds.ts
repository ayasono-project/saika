// src/api/routes/guilds.ts
// ギルド/Discord リソースエンドポイント（/api/guilds 配下）

import type { Channel as ContractChannel } from "@ayasono/shared/api";
import type { Guild as DiscordGuild } from "discord.js";
import type { FastifyPluginAsync } from "fastify";
import type { BotClient } from "../../bot/client";
import { tDefault } from "../../shared/locale/localeManager";
import { mapChannel, mapMember, mapRole } from "../lib/discordMappers";
import { ApiHttpError } from "../lib/httpError";
import type { ApiServerDeps } from "../types";

/** guildRoutes プラグインのオプション */
export interface GuildRoutesOptions {
  deps: ApiServerDeps;
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
 * - GET /:guildId/*  : チャンネル/ロール/メンバー（authenticate + requireGuildAccess）
 *
 * 管理可能なギルド一覧（GET /api/guilds）は Discord 由来の情報（Bot 未参加ギルド含む）が
 * 必要なため web BFF が担当する。saika は Bot が参加済みのギルドのリソースのみ扱う。
 * その一覧の botJoined 補完用に GET /joined（参加済み管理可能ギルドID）だけ提供する。
 */
export const guildRoutes: FastifyPluginAsync<GuildRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { client } = opts.deps;

  // Bot が参加済みの「管理可能ギルド」ID 一覧。
  // web BFF がサーバー一覧の botJoined を補完するために照会する（guildId 非依存のため authenticate のみ）。
  fastify.get(
    "/joined",
    { preHandler: fastify.authenticate },
    async (request) => {
      const manageable = request.authUser?.guilds ?? [];
      const data = manageable.filter((id) => client.guilds.cache.has(id));
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
