// tests/unit/api/discordMappers.test.ts
// discord.js → 契約型マッパーのユニットテスト

import {
  ChannelType,
  type Guild as DiscordGuild,
  type Role as DiscordRole,
  type GuildBasedChannel,
  type GuildMember,
} from "discord.js";
import { describe, expect, it } from "vitest";
import type { DiscordPartialGuild } from "@/api/auth/discordOAuthService";
import {
  mapChannel,
  mapContractChannelType,
  mapGuildSummary,
  mapMember,
  mapRole,
} from "@/api/lib/discordMappers";

describe("mapContractChannelType", () => {
  it("text/voice/category へ写像し、対象外は null", () => {
    expect(mapContractChannelType(ChannelType.GuildText)).toBe("text");
    expect(mapContractChannelType(ChannelType.GuildAnnouncement)).toBe("text");
    expect(mapContractChannelType(ChannelType.GuildVoice)).toBe("voice");
    expect(mapContractChannelType(ChannelType.GuildStageVoice)).toBe("voice");
    expect(mapContractChannelType(ChannelType.GuildCategory)).toBe("category");
    expect(mapContractChannelType(ChannelType.PublicThread)).toBeNull();
  });
});

describe("mapChannel", () => {
  it("対象チャンネルを {id,name,type} に変換する", () => {
    const ch = {
      id: "c1",
      name: "general",
      type: ChannelType.GuildText,
    } as unknown as GuildBasedChannel;
    expect(mapChannel(ch)).toEqual({ id: "c1", name: "general", type: "text" });
  });

  it("対象外種別は null", () => {
    const ch = {
      id: "t1",
      name: "thread",
      type: ChannelType.PublicThread,
    } as unknown as GuildBasedChannel;
    expect(mapChannel(ch)).toBeNull();
  });
});

describe("mapRole", () => {
  it("色付きロールは hexColor を返す", () => {
    const role = {
      id: "r1",
      name: "VIP",
      color: 5793266,
      hexColor: "#5865f2",
    } as unknown as DiscordRole;
    expect(mapRole(role)).toEqual({ id: "r1", name: "VIP", color: "#5865f2" });
  });

  it("色なし(0)は null", () => {
    const role = {
      id: "r0",
      name: "Default",
      color: 0,
      hexColor: "#000000",
    } as unknown as DiscordRole;
    expect(mapRole(role).color).toBeNull();
  });
});

describe("mapMember", () => {
  it("表示名を name にする", () => {
    const member = {
      id: "u1",
      displayName: "Nick",
    } as unknown as GuildMember;
    expect(mapMember(member)).toEqual({ id: "u1", name: "Nick" });
  });
});

describe("mapGuildSummary", () => {
  const partial: DiscordPartialGuild = {
    id: "g1",
    name: "OAuth Name",
    icon: "hash",
    owner: true,
    permissions: "0",
  };

  it("Bot 参加済みなら Bot 側の値を優先し botJoined=true", () => {
    const botGuild = {
      name: "Bot Name",
      iconURL: () => "https://cdn/bot.png",
      memberCount: 42,
    } as unknown as DiscordGuild;
    expect(mapGuildSummary(partial, botGuild)).toEqual({
      id: "g1",
      name: "Bot Name",
      icon: "https://cdn/bot.png",
      memberCount: 42,
      botJoined: true,
    });
  });

  it("Bot 未参加なら OAuth 値・CDN アイコン・botJoined=false", () => {
    expect(mapGuildSummary(partial, undefined)).toEqual({
      id: "g1",
      name: "OAuth Name",
      icon: "https://cdn.discordapp.com/icons/g1/hash.png",
      memberCount: 0,
      botJoined: false,
    });
  });

  it("Bot 未参加かつアイコン無しは null", () => {
    const noIcon: DiscordPartialGuild = { ...partial, icon: null };
    expect(mapGuildSummary(noIcon, undefined).icon).toBeNull();
  });
});
