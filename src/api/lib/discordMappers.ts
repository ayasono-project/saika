// src/api/lib/discordMappers.ts
// discord.js のリソース → ダッシュボード契約型（@ayasono/shared/api）への変換

import type {
  Channel as ContractChannel,
  ChannelType as ContractChannelType,
  Guild as ContractGuild,
  Member as ContractMember,
  Role as ContractRole,
} from "@ayasono/shared/api";
import {
  ChannelType,
  type Guild as DiscordGuild,
  type Role as DiscordRole,
  type GuildBasedChannel,
  type GuildMember,
} from "discord.js";
import type { DiscordPartialGuild } from "../auth/discordOAuthService";

const DISCORD_CDN_BASE = "https://cdn.discordapp.com";

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

/** OAuth のアイコンハッシュから CDN URL を組み立てる */
function partialIconUrl(partial: DiscordPartialGuild): string | null {
  return partial.icon
    ? `${DISCORD_CDN_BASE}/icons/${partial.id}/${partial.icon}.png`
    : null;
}

/**
 * ユーザーの OAuth ギルドと Bot のギルドキャッシュを突き合わせて契約 Guild に変換する。
 * Bot 参加済みなら名前/アイコン/メンバー数は Bot 側の最新値を優先する。
 */
export function mapGuildSummary(
  partial: DiscordPartialGuild,
  botGuild: DiscordGuild | undefined,
): ContractGuild {
  return {
    id: partial.id,
    name: botGuild?.name ?? partial.name,
    icon: botGuild?.iconURL() ?? partialIconUrl(partial),
    memberCount: botGuild?.memberCount ?? 0,
    botJoined: botGuild !== undefined,
  };
}
