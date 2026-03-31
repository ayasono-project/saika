// src/bot/features/vac/commands/helpers/vacConfigTargetResolver.ts
// vac-config の入力解決ヘルパー

import {
  type CategoryChannel,
  ChannelType,
  type Guild,
  type VoiceChannel,
} from "discord.js";
import { VAC_CONFIG_COMMAND } from "../vacConfigCommand.constants";

/**
 * 操作対象カテゴリを入力値と実行チャンネル文脈から解決する
 */
export async function resolveTargetCategory(
  guild: Guild,
  interactionChannelId: string,
  categoryOption: string | null,
): Promise<CategoryChannel | null> {
  // 未指定時は実行チャンネルの親カテゴリを既定値として採用
  if (!categoryOption) {
    const currentChannel = await guild.channels
      .fetch(interactionChannelId)
      .catch(() => null);
    return currentChannel?.parent?.type === ChannelType.GuildCategory
      ? currentChannel.parent
      : null;
  }

  // TOP 指定はカテゴリ未所属（null）として扱う
  if (categoryOption.toUpperCase() === VAC_CONFIG_COMMAND.TARGET.TOP) {
    return null;
  }

  // ID 解決を優先し、見つからない場合のみ名前一致で補完
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

/**
 * 指定カテゴリに対応する VAC トリガーチャンネルを探索する
 */
export async function findTriggerChannelByCategory(
  guild: Guild,
  triggerChannelIds: string[],
  categoryId: string | null,
): Promise<VoiceChannel | null> {
  // 設定済みトリガー候補を順に実体解決してカテゴリ一致を判定
  for (const triggerId of triggerChannelIds) {
    const channel = await guild.channels.fetch(triggerId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      continue;
    }

    const parentId =
      channel.parent?.type === ChannelType.GuildCategory
        ? channel.parent.id
        : null;
    if (parentId === categoryId) {
      return channel;
    }
  }

  return null;
}
