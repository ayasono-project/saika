// src/api/auth/guildAccess.ts
// ギルドアクセスを検証する preHandler。
// JWT クレームの管理可能ギルド一覧（web BFF がログイン時に算出）に対象 guildId が
// 含まれるかを判定するのみで、Discord には問い合わせない。

import type { FastifyReply, FastifyRequest } from "fastify";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";

/**
 * ギルドアクセス検証 preHandler を生成する（`/api/guilds/:guildId/*` に適用）。
 *
 * 前提: authenticate が先に適用され request.authUser が存在すること。
 * 対象 guildId が管理可能ギルド一覧に無ければ 403、通過時は request.guildId を付与する。
 */
export function createRequireGuildAccess(): (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> {
  return async (request) => {
    const claims = request.authUser;
    if (!claims) {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }

    const guildId = (request.params as { guildId?: string }).guildId;
    if (!guildId) {
      throw ApiHttpError.validation(tDefault("system:web.guild_id_required"));
    }

    if (!claims.guilds.includes(guildId)) {
      throw ApiHttpError.forbidden(
        tDefault("system:web.guild_permission_denied"),
      );
    }

    request.guildId = guildId;
  };
}
