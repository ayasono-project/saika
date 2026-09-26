// Bot がチケットのチャンネルを扱えるか（チャンネルでの Bot の権限）の確認

import { ValidationError } from "@ayasono/shared/core";
import {
  DiscordAPIError,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type PermissionsString,
  RESTJSONErrorCodes,
  type TextChannel,
} from "discord.js";
import type { Ticket } from "../../../shared/database/types";
import { TICKET_CHANNEL_BOT_PERMISSIONS } from "../commands/ticketCommand.constants";

/**
 * Bot がチケットのチャンネルを扱えない理由
 * - channel_permissions: チャンネルを扱う権限（TICKET_CHANNEL_BOT_PERMISSIONS）のどれかが無い、または確かめられない
 *   （Bot を外して入れ直した後の、それより前に作ったチケット等。管理者がチャンネルに Bot を付け直す）
 * - manage_channels: 扱う権限はそろっているが、削除に要る「チャンネルの管理」が無い
 *   （削除の経路で TICKET_CHANNEL_BOT_DELETE_PERMISSIONS を求めたときだけ起きる）
 */
export type TicketChannelInaccessibleReason =
  | "channel_permissions"
  | "manage_channels";

/**
 * Bot から見たチケットのチャンネルの状態
 * - handleable: チャンネルがあり、Bot が扱える
 * - missing: チャンネルが無い（削除済み）と確定した
 * - inaccessible: チャンネルはある（またはあるかどうか確かめられない）が、Bot が扱えない
 */
export type TicketChannelAccess =
  | { status: "handleable"; channel: TextChannel }
  | { status: "missing" }
  | { status: "inaccessible"; reason: TicketChannelInaccessibleReason };

/** Bot がチケットのチャンネルを扱えないときの、操作者への案内のキー */
export type BotChannelAccessMessageKey =
  | "ticket:user-response.bot_channel_access_missing"
  | "ticket:user-response.bot_manage_channels_missing";

/** Bot が扱えない理由ごとの、操作者への案内のキー */
const INACCESSIBLE_REASON_MESSAGE_KEYS: Readonly<
  Record<TicketChannelInaccessibleReason, BotChannelAccessMessageKey>
> = {
  channel_permissions: "ticket:user-response.bot_channel_access_missing",
  manage_channels: "ticket:user-response.bot_manage_channels_missing",
};

/**
 * Bot 自身のメンバーを取得する（キャッシュに無ければ取りに行く）
 * @param guild 対象ギルド
 * @returns Bot 自身のメンバー（取得できなければ null）
 */
export async function resolveBotMember(
  guild: Guild,
): Promise<GuildMember | null> {
  return guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
}

/**
 * Bot がチャンネルで必要な権限をすべて持つか調べ、持たなければその理由を返す
 * 権限は、ロールとチャンネルの上書きから計算する（閲覧できないチャンネルでも、上書きは
 * guild.channels.fetch() の結果に含まれるので判定できる）
 * @param channel 対象チャンネル
 * @param me Bot 自身のメンバー
 * @param requiredPermissions 必要な権限
 * @returns 扱えない理由（すべて持っていれば null）
 */
function findInaccessibleReason(
  channel: GuildBasedChannel,
  me: GuildMember,
  requiredPermissions: readonly PermissionsString[],
): TicketChannelInaccessibleReason | null {
  const missing = channel.permissionsFor(me)?.missing(requiredPermissions);
  if (!missing) return "channel_permissions";
  if (missing.length === 0) return null;
  // 扱う権限が1つでも欠けていれば、先にそちらを付け直してもらう（削除の権限だけ足しても扱えないため）
  return missing.some((permission) =>
    TICKET_CHANNEL_BOT_PERMISSIONS.includes(permission),
  )
    ? "channel_permissions"
    : "manage_channels";
}

/**
 * Bot がチャンネルを扱えるか（必要な権限をすべて持つか）を判定する
 * @param channel 対象チャンネル
 * @param me Bot 自身のメンバー
 * @param requiredPermissions 必要な権限（省略時は扱うための TICKET_CHANNEL_BOT_PERMISSIONS）
 * @returns 扱える場合 true
 */
export function canBotHandleTicketChannel(
  channel: GuildBasedChannel,
  me: GuildMember,
  requiredPermissions: readonly PermissionsString[] = TICKET_CHANNEL_BOT_PERMISSIONS,
): boolean {
  return findInaccessibleReason(channel, me, requiredPermissions) === null;
}

/**
 * チケットのチャンネルを取得し、Bot が扱えるか調べる
 *
 * 取得に失敗したときは、Discord が「チャンネルが無い」と返したときだけ missing とし、
 * それ以外（見る権限が無い・一時的な失敗）は inaccessible とする（無いと誤判定して記録を消さないため）
 * @param guild 対象ギルド
 * @param channelId チケットのチャンネルID
 * @param requiredPermissions 必要な権限（省略時は扱うための TICKET_CHANNEL_BOT_PERMISSIONS。
 *   削除の経路では TICKET_CHANNEL_BOT_DELETE_PERMISSIONS を渡す）
 * @returns チャンネルの状態
 */
export async function getTicketChannelAccess(
  guild: Guild,
  channelId: string,
  requiredPermissions: readonly PermissionsString[] = TICKET_CHANNEL_BOT_PERMISSIONS,
): Promise<TicketChannelAccess> {
  let channel: GuildBasedChannel | null;
  try {
    channel = await guild.channels.fetch(channelId);
  } catch (error) {
    const isUnknownChannel =
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownChannel;
    return isUnknownChannel
      ? { status: "missing" }
      : { status: "inaccessible", reason: "channel_permissions" };
  }
  if (!channel) return { status: "missing" };

  const me = await resolveBotMember(guild);
  const reason = me
    ? findInaccessibleReason(channel, me, requiredPermissions)
    : "channel_permissions";
  if (reason) return { status: "inaccessible", reason };
  // チケットのチャンネルは createTicketChannel がテキストチャンネルとして作る
  return { status: "handleable", channel: channel as TextChannel };
}

/**
 * Bot がチケットのチャンネルを扱えないときに、操作者へ返す案内のキーを選ぶ
 * 「チャンネルの管理」だけが無いときは、Bot のロールかチャンネルの権限設定を見直す案内にする。
 * それ以外（扱う権限が無い・確かめられない・チャンネルが無い）は、チャンネルに Bot を付け直す案内にする
 * @param access 扱えなかったときのチャンネルの状態
 * @returns 案内のキー
 */
export function toBotChannelAccessMessageKey(
  access: Exclude<TicketChannelAccess, { status: "handleable" }>,
): BotChannelAccessMessageKey {
  return INACCESSIBLE_REASON_MESSAGE_KEYS[
    access.status === "inaccessible" ? access.reason : "channel_permissions"
  ];
}

/**
 * チケットのチャンネルを Bot が扱えることを確かめて返す。扱えなければ ValidationError を投げる
 *
 * クローズ・再オープンの各処理が、記録やタイマーを変える前に呼ぶ。呼び出し側（コマンド・ボタン）は
 * 事前に findHandleableTicketChannelOrReply で確かめているが、それをすり抜けても、チャンネルを
 * 操作できないまま記録だけが変わる食い違いを残さないため
 * @param guild 対象ギルド
 * @param ticket 対象チケット
 * @returns Bot が扱えるチケットのチャンネル
 * @throws ValidationError チャンネルが無い、または Bot が扱えない場合
 */
export async function requireHandleableTicketChannel(
  guild: Guild,
  ticket: Ticket,
): Promise<TextChannel> {
  const access = await getTicketChannelAccess(guild, ticket.channelId);
  if (access.status !== "handleable") {
    throw ValidationError.fromKey(toBotChannelAccessMessageKey(access));
  }
  return access.channel;
}
