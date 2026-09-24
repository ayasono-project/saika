// Bot が参加しているギルドを解決するヘルパー

import type { Guild as DiscordGuild } from "discord.js";
import type { BotClient } from "../../bot/client";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "./httpError";

/**
 * Bot が参加しているギルドを取得する。参加していなければ 404 を投げる
 *
 * JWT クレームの管理可能ギルド一覧には Bot 未参加のギルドも含まれるため、
 * ユーザーの権限だけでは Bot の参加は保証されない。
 * @param client Discord クライアント
 * @param guildId 対象ギルドID
 * @returns Bot が参加しているギルド
 */
export function requireBotGuild(
  client: BotClient,
  guildId: string | undefined,
): DiscordGuild {
  const guild = guildId ? client.guilds.cache.get(guildId) : undefined;
  if (!guild) {
    throw ApiHttpError.notFound(tDefault("system:web.bot_not_in_guild"));
  }
  return guild;
}
