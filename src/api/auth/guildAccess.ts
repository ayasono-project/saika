// ギルドアクセスを検証する preHandler。
// JWT クレームの管理可能ギルド一覧（web BFF がログイン時に算出）に対象 guildId が
// 含まれるかと、Bot がそのギルドに参加しているか（ゲートウェイのキャッシュ）を判定する。
// Discord の REST API には問い合わせない。

import type { FastifyReply, FastifyRequest } from "fastify";
import type { BotClient } from "../../bot/client";
import { tDefault } from "../../shared/locale/localeManager";
import { requireBotGuild } from "../lib/botGuild";
import { ApiHttpError } from "../lib/httpError";

/**
 * ギルドアクセス検証 preHandler を生成する（`/api/guilds/:guildId/*` に適用）。
 *
 * 前提: authenticate が先に適用され request.authUser が存在すること。
 * 対象 guildId が管理可能ギルド一覧に無ければ 403、Bot が参加していなければ 404、
 * 通過時は request.guildId を付与する。
 *
 * **Bot 未参加のギルドを通さない理由。** 全機能テーブルは `guilds` の親行へ FK を
 * 張っているため、親行の無いギルドへの書き込みは FK 違反（500）になる。退出後の
 * 猶予中のギルドは親行があるので書き込めてしまうが、Bot が居ないので設定は効かず、
 * 猶予が切れれば消える。どちらも受け付ける意味がない。
 * @param client Discord クライアント（参加判定に使う）
 * @returns preHandler 関数
 */
export function createRequireGuildAccess(
  client: BotClient,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
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

    // 権限の判定を先に行う。逆にすると、管理権限の無いギルドについても
    // 「Bot が参加しているか」が 403/404 の違いで分かってしまう
    requireBotGuild(client, guildId);

    request.guildId = guildId;
  };
}
