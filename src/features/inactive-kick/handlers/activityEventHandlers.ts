// src/features/inactive-kick/handlers/activityEventHandlers.ts
// 非アクティブ自動キックのアクティビティ記録 — 各イベントの薄いアダプタ + レコード掃除

import type {
  GuildMember,
  Message,
  MessageReaction,
  PartialGuildMember,
  PartialMessageReaction,
  PartialUser,
  User,
  VoiceState,
} from "discord.js";
import { getBotMemberActivityRepository } from "../../../bot/services/botCompositionRoot";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { recordMemberActivity } from "./recordActivity";

/**
 * messageCreate でのアクティビティ記録。
 * @param message 受信メッセージ
 */
export async function handleInactiveKickMessageActivity(
  message: Message,
): Promise<void> {
  // Bot・DM は対象外
  if (message.author.bot) return;
  const guild = message.guild;
  if (!guild) return;

  const userId = message.author.id;
  // メンバー解決は1回だけ行い、在籍階層の解決・対象ロール剥奪の双方で使い回す
  let cachedMember: GuildMember | null | undefined =
    message.member ?? undefined;
  const resolveMember = async (): Promise<GuildMember | null> => {
    if (cachedMember !== undefined) return cachedMember;
    cachedMember = await guild.members.fetch(userId).catch(() => null);
    return cachedMember;
  };

  await recordMemberActivity(
    guild,
    userId,
    "message",
    async () => (await resolveMember())?.joinedAt ?? null,
    resolveMember,
  );
}

/**
 * voiceStateUpdate でのアクティビティ記録。
 * 「VC への参加」のみを活動とみなす（ミュート切替・移動等は対象外）。
 * @param oldState 変更前のボイス状態
 * @param newState 変更後のボイス状態
 */
export async function handleInactiveKickVoiceActivity(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  // 参加（null → チャンネル）以外は無視
  if (!(oldState.channelId === null && newState.channelId !== null)) return;

  const member = newState.member;
  if (!member || member.user.bot) return;

  await recordMemberActivity(
    newState.guild,
    member.id,
    "voice",
    async () => member.joinedAt,
    async () => member,
  );
}

/**
 * messageReactionAdd でのアクティビティ記録。
 * @param reaction 追加されたリアクション（Partial の可能性あり）
 * @param user リアクションしたユーザー（Partial の可能性あり）
 */
export async function handleInactiveKickReactionActivity(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  // Bot は対象外（Partial ユーザーでも bot フラグは利用可能）
  if (user.bot) return;
  // ギルドは Bot のキャッシュから解決できる（メッセージが Partial でも guild は得られる）
  const guild = reaction.message.guild;
  if (!guild) return;

  // メンバー解決は1回だけ行い、在籍階層の解決・対象ロール剥奪の双方で使い回す
  let cachedMember: GuildMember | null | undefined;
  const resolveMember = async (): Promise<GuildMember | null> => {
    if (cachedMember !== undefined) return cachedMember;
    cachedMember = await guild.members.fetch(user.id).catch(() => null);
    return cachedMember;
  };

  await recordMemberActivity(
    guild,
    user.id,
    "reaction",
    async () => (await resolveMember())?.joinedAt ?? null,
    resolveMember,
  );
}

/**
 * guildMemberRemove での活動履歴の掃除（孤児レコード防止）。
 * @param member 退出したギルドメンバー（Partial の可能性あり）
 */
export async function handleInactiveKickMemberRemove(
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const guildId = member.guild.id;
  const userId = member.user?.id;
  if (!userId) return;

  try {
    await getBotMemberActivityRepository().deleteActivity(guildId, userId);
  } catch (err) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.inactive_kick",
        "inactiveKick:log.activity_cleanup_failed",
        { guildId, userId },
      ),
      err,
    );
  }
}
