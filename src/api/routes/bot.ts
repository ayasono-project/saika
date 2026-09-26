// Bot 自身の公開情報（ダッシュボードのブランド表示 + 「Bot を追加」招待リンク）。
// guildId 非依存・公開情報のため認証不要。

import type { PermissionsString } from "discord.js";
import type { FastifyPluginAsync } from "fastify";
import type { ApiServerDeps } from "../types";

/** botRoutes プラグインのオプション */
export interface BotRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * Bot 招待時に要求する権限（最小権限セット・型は discord.js で検証）。
 * Administrator は要求しない。各機能の実 API 呼び出しに必要な個別権限のみを列挙する:
 * - 共通（対象チャンネルの把握・message-delete のスキャン）: ViewChannel / ReadMessageHistory
 * - Bot 自発の投稿（sticky / bump / member-log / vc-auto-recruit / unverified-kick）:
 *   SendMessages / EmbedLinks
 *   ※ interaction 応答（reply / editReply / followUp）は interaction トークン経由で
 *     チャンネルの送信権限を要求しないため、コマンド応答のためだけには要らない
 * - reaction-role / ticket / kick 系マーカーロール: ManageRoles
 * - message-delete / sticky-message: ManageMessages
 * - ticket / vac（チャンネル作成・編集・overwrite）: ManageChannels
 * - vac / afk（メンバー移動）: MoveMembers / Connect（移動先VCへの接続権限が別途必要）
 * - unverified-kick: KickMembers
 * - member-log（招待元トラッキング = guild.invites.fetch）: ManageGuild
 * - message-delete（削除対象にスレッドを選べる）: ManageThreads
 * - bump-reminder（スレッド内で Bump された場合の予約パネル・リマインダー送信）: SendMessagesInThreads
 *   ※ Bot はスレッドを作らないため CreatePublicThreads は不要。
 *     interaction 応答は interaction トークン経由で送信権限を要求しないため、
 *     コマンド応答だけならこの権限は不要だが、Bump 検知は messageCreate 起点の
 *     channel.send() なのでスレッドでは SendMessagesInThreads が必須になる。
 *     ticket / reaction-role のパネルはアーカイブで見失うためスレッドへ設置させない
 *     （rejectThreadChannel で拒否）。
 *
 * 注: @everyone/@here や「メンション不可ロール」への通知を実際に飛ばす MentionEveryone は
 * 含めない（メッセージ投稿自体は成功し、当該メンションが通知を飛ばさないだけ）。
 */
const INVITE_PERMISSIONS: PermissionsString[] = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "ReadMessageHistory",
  "ManageMessages",
  "ManageChannels",
  "ManageRoles",
  "MoveMembers",
  "Connect",
  "KickMembers",
  "ManageGuild",
  "ManageThreads",
  "SendMessagesInThreads",
];

/**
 * Bot 情報ルートプラグイン。
 * - GET /bot : ブランド表示用のアバター/名前 + 「Bot を追加」の招待 URL
 */
export const botRoutes: FastifyPluginAsync<BotRoutesOptions> = async (
  fastify,
  opts,
) => {
  fastify.get("/bot", async () => {
    const client = opts.deps.client;
    const user = client.user;
    // 招待 URL は application 未準備時に throw しうるため握りつぶして null。
    // discord.js（OAuth2Scopes）は静的 import グラフを汚さないよう動的 import する。
    let inviteUrl: string | null = null;
    try {
      const { OAuth2Scopes } = await import("discord.js");
      inviteUrl = client.generateInvite({
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        permissions: INVITE_PERMISSIONS,
      });
    } catch {
      inviteUrl = null;
    }
    return {
      data: {
        id: user?.id ?? null,
        username: user?.username ?? "Saika",
        avatarUrl: user?.displayAvatarURL() ?? null,
        inviteUrl,
      },
    };
  });
};
