// src/api/features/overviewResource.ts
// ギルド概要（GET /api/guilds/:guildId）— ギルドサマリー + 機能別ステータス集計。

import type {
  Guild as ContractGuild,
  FeatureStatus,
  GuildOverview,
} from "@ayasono/shared/api";
import type { Guild as DiscordGuild } from "discord.js";
import type { BotClient } from "../../bot/client";
import {
  getBotReactionRolePanelSettingsService,
  getBotStickyMessageSettingsService,
  getBotTicketSettingsService,
  getBotVcRecruitSettingsService,
} from "../../bot/services/botCompositionRoot";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import type { ApiServerDeps } from "../types";
import { createAfkResource } from "./afkResource";
import { createBumpResource } from "./bumpResource";
import { createConfigResource } from "./configResource";
import { createInactiveKickResource } from "./inactiveKickResource";
import { createMemberLogResource } from "./memberLogResource";
import { createUnverifiedKickResource } from "./unverifiedKickResource";
import { createVacResource } from "./vacResource";
import { createVcAutoRecruitResource } from "./vcAutoRecruitResource";

/** 機能ステータス集計に渡す、各機能から読み取った値 */
export interface OverviewInputs {
  locale: string;
  afkEnabled: boolean;
  afkChannelId: string | null;
  vacEnabled: boolean;
  vacTriggerCount: number;
  vcRecruitEnabled: boolean;
  vcRecruitSetupCount: number;
  vcAutoRecruitEnabled: boolean;
  vcAutoRecruitCategoryCount: number;
  stickyCount: number;
  memberLogEnabled: boolean;
  memberLogChannelId: string | null;
  bumpEnabled: boolean;
  bumpMentionRoleId: string | null;
  ticketCount: number;
  reactionRoleCount: number;
  inactiveKickEnabled: boolean;
  inactiveKickThresholdDays: number;
  unverifiedKickEnabled: boolean;
  unverifiedKickVerifiedRoleId: string | null;
}

/** enabled/disabled の状態文字列 */
function toggle(enabled: boolean): FeatureStatus["state"] {
  return enabled ? "enabled" : "disabled";
}

/** コレクション系（件数ベース）の状態文字列 */
function presence(count: number): FeatureStatus["state"] {
  return count > 0 ? "enabled" : "unconfigured";
}

/**
 * 読み取り済みの値から機能別ステータス一覧を構築する（純粋関数・表示順は web の概要に揃える）。
 */
export function toFeatureStatuses(input: OverviewInputs): FeatureStatus[] {
  return [
    { key: "general", state: "enabled", summary: `言語: ${input.locale}` },
    {
      key: "afk",
      state: toggle(input.afkEnabled),
      summary: input.afkChannelId
        ? "AFK 移動先: 設定済み"
        : "AFK 移動先: 未設定",
    },
    {
      key: "vac",
      state: toggle(input.vacEnabled),
      summary: `トリガー: ${input.vacTriggerCount}チャンネル`,
    },
    {
      key: "vc-recruit",
      state: toggle(input.vcRecruitEnabled),
      summary: `セットアップ: ${input.vcRecruitSetupCount}件`,
    },
    {
      key: "vc-auto-recruit",
      state: toggle(input.vcAutoRecruitEnabled),
      summary: `対象カテゴリ: ${input.vcAutoRecruitCategoryCount}件`,
    },
    {
      key: "sticky",
      state: presence(input.stickyCount),
      summary: `設定数: ${input.stickyCount}チャンネル`,
    },
    {
      key: "member-log",
      state: toggle(input.memberLogEnabled),
      summary: input.memberLogChannelId ? "通知先: 設定済み" : "通知先: 未設定",
    },
    {
      key: "bump",
      state: toggle(input.bumpEnabled),
      summary: input.bumpMentionRoleId
        ? "メンション設定済み"
        : "メンション未設定",
    },
    {
      key: "tickets",
      state: presence(input.ticketCount),
      summary: `パネル: ${input.ticketCount}件`,
    },
    {
      key: "reaction-roles",
      state: presence(input.reactionRoleCount),
      summary: `パネル: ${input.reactionRoleCount}件`,
    },
    {
      key: "inactive-kick",
      state: toggle(input.inactiveKickEnabled),
      summary: `閾値: ${input.inactiveKickThresholdDays}日`,
    },
    {
      key: "unverified-kick",
      state: toggle(input.unverifiedKickEnabled),
      summary: input.unverifiedKickVerifiedRoleId
        ? "認証ロール設定済み"
        : "認証ロール未設定",
    },
  ];
}

/** discord.js ギルド → 契約 Guild サマリー（概要は Bot 参加済みギルドのみ） */
function toGuildSummary(guild: DiscordGuild): ContractGuild {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
    memberCount: guild.memberCount,
    botJoined: true,
  };
}

/** 各機能の設定を読み取り、概要ステータスへ集計する */
async function collectInputs(
  deps: ApiServerDeps,
  guildId: string,
): Promise<OverviewInputs> {
  const { prisma } = deps;
  const [
    config,
    afk,
    vac,
    memberLog,
    bump,
    vcAuto,
    inactive,
    unverified,
    vcRecruit,
    sticky,
    tickets,
    reactionRoles,
  ] = await Promise.all([
    createConfigResource(prisma).read(guildId),
    createAfkResource().read(guildId),
    createVacResource().read(guildId),
    createMemberLogResource(prisma).read(guildId),
    createBumpResource().read(guildId),
    createVcAutoRecruitResource(prisma).read(guildId),
    createInactiveKickResource(prisma).read(guildId),
    createUnverifiedKickResource(prisma).read(guildId),
    getBotVcRecruitSettingsService().getVcRecruitSettingsOrDefault(guildId),
    getBotStickyMessageSettingsService().findAllByGuild(guildId),
    getBotTicketSettingsService().findAllByGuild(guildId),
    getBotReactionRolePanelSettingsService().findAllByGuild(guildId),
  ]);

  return {
    locale: config.locale,
    afkEnabled: afk.enabled,
    afkChannelId: afk.channelId,
    vacEnabled: vac.enabled,
    vacTriggerCount: vac.triggerChannelIds.length,
    vcRecruitEnabled: vcRecruit.enabled,
    vcRecruitSetupCount: vcRecruit.setups.length,
    vcAutoRecruitEnabled: vcAuto.enabled,
    vcAutoRecruitCategoryCount: vcAuto.enabledCategoryIds.length,
    stickyCount: sticky.length,
    memberLogEnabled: memberLog.enabled,
    memberLogChannelId: memberLog.channelId,
    bumpEnabled: bump.enabled,
    bumpMentionRoleId: bump.mentionRoleId,
    ticketCount: tickets.length,
    reactionRoleCount: reactionRoles.length,
    inactiveKickEnabled: inactive.enabled,
    inactiveKickThresholdDays: inactive.thresholdDays,
    unverifiedKickEnabled: unverified.enabled,
    unverifiedKickVerifiedRoleId: unverified.verifiedRoleId,
  };
}

/**
 * ギルド概要を構築する。
 * Bot が参加していないギルドは概要を返せないため 404。
 */
export async function buildOverview(
  deps: ApiServerDeps,
  guildId: string,
): Promise<GuildOverview> {
  const guild = (deps.client as BotClient).guilds.cache.get(guildId);
  if (!guild) {
    throw ApiHttpError.notFound(tDefault("system:web.bot_not_in_guild"));
  }
  return {
    guild: toGuildSummary(guild),
    features: toFeatureStatuses(await collectInputs(deps, guildId)),
  };
}
