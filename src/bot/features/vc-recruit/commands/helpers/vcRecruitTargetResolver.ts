// src/bot/features/vc-recruit/commands/helpers/vcRecruitTargetResolver.ts
// vc-recruit-config の入力解決ヘルパー

import { type CategoryChannel, ChannelType, type Guild } from "discord.js";
import { VC_RECRUIT_CONFIG_COMMAND } from "../vcRecruitConfigCommand.constants";

/**
 * 操作対象カテゴリを入力値と実行チャンネル文脈から解決する
 */
export async function resolveTargetCategory(
  guild: Guild,
  interactionChannelId: string,
  categoryOption: string | null,
): Promise<CategoryChannel | null> {
  if (!categoryOption) {
    const currentChannel = await guild.channels
      .fetch(interactionChannelId)
      .catch(() => null);
    return currentChannel?.parent?.type === ChannelType.GuildCategory
      ? currentChannel.parent
      : null;
  }

  if (categoryOption.toUpperCase() === VC_RECRUIT_CONFIG_COMMAND.TARGET.TOP) {
    return null;
  }

  const byId = await guild.channels.fetch(categoryOption).catch(() => null);
  if (byId?.type === ChannelType.GuildCategory) {
    return byId;
  }

  const byName = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === categoryOption.toLowerCase(),
  );

  if (byName?.type === ChannelType.GuildCategory) {
    return byName;
  }

  return null;
}
