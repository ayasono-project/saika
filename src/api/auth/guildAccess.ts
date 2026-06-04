// src/api/auth/guildAccess.ts
// ギルド権限（ManageGuild / オーナー）を検証する preHandler とギルド一覧キャッシュ

import type { FastifyReply, FastifyRequest } from "fastify";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import {
  DISCORD_PERMISSION_MANAGE_GUILD,
  GUILD_CACHE_TTL_MS,
} from "./authConstants";
import type {
  DiscordOAuthService,
  DiscordPartialGuild,
} from "./discordOAuthService";
import { clearAuthCookies, getDiscordAccessToken } from "./session";

/**
 * ユーザーごとの所属ギルド一覧をメモリにキャッシュする（TTL 60 秒）。
 * Discord API レートリミットの緩和と refresh_token 消費の削減のため。
 */
export class GuildAccessCache {
  private readonly cache = new Map<
    string,
    { guilds: DiscordPartialGuild[]; expiresAt: number }
  >();

  /** 有効なキャッシュがあれば返す（無ければ null） */
  get(userId: string): DiscordPartialGuild[] | null {
    const entry = this.cache.get(userId);
    if (!entry || entry.expiresAt <= Date.now()) {
      return null;
    }
    return entry.guilds;
  }

  /** ギルド一覧を TTL 付きで保存する */
  set(userId: string, guilds: DiscordPartialGuild[]): void {
    this.cache.set(userId, {
      guilds,
      expiresAt: Date.now() + GUILD_CACHE_TTL_MS,
    });
  }
}

/** ギルドに対する ManageGuild 権限（またはオーナー）を持つか判定する */
export function hasManageGuild(guild: DiscordPartialGuild): boolean {
  if (guild.owner) return true;
  try {
    // permissions は 64bit ビットフィールド文字列のため BigInt で判定
    return (BigInt(guild.permissions) & DISCORD_PERMISSION_MANAGE_GUILD) !== 0n;
  } catch {
    return false;
  }
}

/**
 * ユーザーの所属ギルド一覧を取得する（キャッシュ優先）。
 * キャッシュミス時は refresh トークンでアクセストークンを取得して Discord から取得する。
 * 認証済み（request.authUser あり）のルートから再利用する。
 */
export async function getUserGuilds(
  userId: string,
  request: FastifyRequest,
  reply: FastifyReply,
  oauth: DiscordOAuthService,
  cache: GuildAccessCache,
): Promise<DiscordPartialGuild[]> {
  const cached = cache.get(userId);
  if (cached) return cached;

  let access: string | null;
  try {
    access = await getDiscordAccessToken(request, reply, oauth);
  } catch {
    access = null;
  }
  if (!access) {
    clearAuthCookies(reply);
    throw ApiHttpError.unauthorized(
      tDefault("system:web.auth_session_expired"),
    );
  }

  const guilds = await oauth.fetchUserGuilds(access);
  cache.set(userId, guilds);
  return guilds;
}

/**
 * ギルド権限検証 preHandler を生成する（`/api/guilds/:guildId/*` に適用）。
 *
 * 前提: authenticate が先に適用され request.authUser が存在すること。
 * 対象ギルドの非メンバー/権限不足は 403、通過時は request.guildId を付与する。
 */
export function createRequireGuildAccess(
  oauth: DiscordOAuthService,
  cache: GuildAccessCache,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    const session = request.authUser;
    if (!session) {
      throw ApiHttpError.unauthorized(
        tDefault("system:web.auth_session_required"),
      );
    }

    const guildId = (request.params as { guildId?: string }).guildId;
    if (!guildId) {
      throw ApiHttpError.validation(tDefault("system:web.guild_id_required"));
    }

    const guilds = await getUserGuilds(
      session.discordUserId,
      request,
      reply,
      oauth,
      cache,
    );

    const target = guilds.find((g) => g.id === guildId);
    if (!target) {
      throw ApiHttpError.forbidden(tDefault("system:web.guild_not_member"));
    }
    if (!hasManageGuild(target)) {
      throw ApiHttpError.forbidden(
        tDefault("system:web.guild_permission_denied"),
      );
    }

    request.guildId = guildId;
  };
}
