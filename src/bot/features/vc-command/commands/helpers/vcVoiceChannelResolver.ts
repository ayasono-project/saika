// src/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver.ts
// VC操作コマンド向けVC解決ヘルパー

import {
  ChannelType,
  type ChatInputCommandInteraction,
  type VoiceChannel,
} from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";

/**
 * 指定チャンネルIDから編集対象のボイスチャンネルを解決する
 * @param interaction コマンド実行インタラクション
 * @param channelId 解決対象のチャンネルID
 * @returns 編集可能なボイスチャンネル
 */
export async function resolveVoiceChannelForEdit(
  interaction: ChatInputCommandInteraction,
  channelId: string,
): Promise<VoiceChannel> {
  const channel = await interaction.guild?.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.not_managed_channel"),
    );
  }

  return channel;
}
