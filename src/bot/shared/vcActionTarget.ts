// src/bot/shared/vcActionTarget.ts
// /vc disconnect・/vc move・/afk の target（member / channel）解決と対象VC検証の共通ヘルパー

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildMember,
  type VoiceChannel,
} from "discord.js";
import { tInteraction } from "../../shared/locale/localeManager";

/** target-member / target-channel の選択結果 */
export type VcTargetSelection =
  | { kind: "member"; userId: string }
  | { kind: "channel"; channelId: string }
  | { kind: "none" };

/**
 * target-member / target-channel オプションから操作対象を解決する
 *
 * 両方指定は競合エラー。どちらも未指定は kind="none"（呼び出し側で扱いを分岐）。
 * @param interaction コマンド実行インタラクション
 * @param memberOptionName メンバーオプション名
 * @param channelOptionName VCチャンネルオプション名
 * @returns 解決した操作対象
 */
export function resolveVcActionTarget(
  interaction: ChatInputCommandInteraction,
  memberOptionName: string,
  channelOptionName: string,
): VcTargetSelection {
  const targetUser = interaction.options.getUser(memberOptionName);
  const targetChannel = interaction.options.getChannel(channelOptionName);

  // メンバーとVCの同時指定は許可しない
  if (targetUser && targetChannel) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_conflict"),
    );
  }

  if (targetUser) {
    return { kind: "member", userId: targetUser.id };
  }

  if (targetChannel) {
    if (targetChannel.type !== ChannelType.GuildVoice) {
      throw new ValidationError(
        tInteraction(interaction.locale, "vc:user-response.target_not_voice"),
      );
    }
    return { kind: "channel", channelId: targetChannel.id };
  }

  return { kind: "none" };
}

/**
 * 対象VCを取得し、ボイスチャンネルかつ1人以上参加していることを検証する
 * @param interaction コマンド実行インタラクション
 * @param channelId 対象VCのチャンネルID
 * @returns 1人以上参加中の対象ボイスチャンネル
 */
export async function fetchNonEmptyVoiceChannel(
  interaction: ChatInputCommandInteraction,
  channelId: string,
): Promise<VoiceChannel> {
  const channel = await interaction.guild?.channels
    .fetch(channelId)
    .catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_not_voice"),
    );
  }

  // コマンド受付時点で対象VCが空ならエラー（実行時点の再検証は別途実施）
  if (channel.members.size === 0) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.channel_empty"),
    );
  }

  return channel;
}

/**
 * 対象ユーザーのメンバーを取得し、ボイスチャンネルに参加中であることを検証する
 * @param interaction コマンド実行インタラクション
 * @param userId 対象ユーザーID
 * @returns VC参加中の対象メンバー
 */
export async function fetchMemberInVoice(
  interaction: ChatInputCommandInteraction,
  userId: string,
): Promise<GuildMember> {
  const member = await interaction.guild?.members
    .fetch(userId)
    .catch(() => null);

  if (!member) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.member_not_found"),
    );
  }

  if (!member.voice.channel) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_not_in_voice"),
    );
  }

  return member;
}
