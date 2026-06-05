// src/api/lib/discordMappers.ts
// discord.js のリソース → ダッシュボード契約型（@ayasono/shared/api）への変換

import type {
  Channel as ContractChannel,
  ChannelType as ContractChannelType,
  Member as ContractMember,
  Role as ContractRole,
} from "@ayasono/shared/api";
import {
  ChannelType,
  type Role as DiscordRole,
  type GuildBasedChannel,
  type GuildMember,
} from "discord.js";

/** discord.js のチャンネル種別を契約の種別へ写像する（対象外は null） */
export function mapContractChannelType(
  type: ChannelType,
): ContractChannelType | null {
  switch (type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return "text";
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return "voice";
    case ChannelType.GuildCategory:
      return "category";
    default:
      return null;
  }
}

/** ギルドチャンネルを契約 Channel へ変換する（対象外種別は null） */
export function mapChannel(channel: GuildBasedChannel): ContractChannel | null {
  const type = mapContractChannelType(channel.type);
  if (!type) return null;
  return { id: channel.id, name: channel.name, type };
}

/** ロールを契約 Role へ変換する（色なし=0 は null） */
export function mapRole(role: DiscordRole): ContractRole {
  return {
    id: role.id,
    name: role.name,
    color: role.color === 0 ? null : role.hexColor,
  };
}

/** メンバーを契約 Member へ変換する（表示名を使用） */
export function mapMember(member: GuildMember): ContractMember {
  return { id: member.id, name: member.displayName };
}
