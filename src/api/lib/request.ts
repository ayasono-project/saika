// src/api/lib/request.ts
// ルートハンドラ共通のリクエストヘルパ

import type { FastifyRequest } from "fastify";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "./httpError";

/**
 * requireGuildAccess 通過後の検証済み guildId を取り出す。
 * preHandler が正しく適用されていれば必ず存在する（防御的に検証）。
 */
export function getGuildId(request: FastifyRequest): string {
  const guildId = request.guildId;
  if (!guildId) {
    throw ApiHttpError.validation(tDefault("system:web.guild_id_required"));
  }
  return guildId;
}
