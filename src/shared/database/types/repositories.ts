// src/shared/database/types/repositories.ts
// 機能別リポジトリインターフェース（必要な範囲だけ依存できる）

import type {
  BumpReminderMentionClearResult,
  BumpReminderMentionRoleResult,
  BumpReminderMentionUserAddResult,
  BumpReminderMentionUserRemoveResult,
  BumpReminderMentionUsersClearResult,
} from "./bumpReminderTypes";
import type {
  AfkConfig,
  BumpReminderConfig,
  GuildConfig,
  MemberLogConfig,
  VacConfig,
} from "./entities";
import type { GuildReactionRolePanel } from "./reactionRoleTypes";
import type { StickyMessage } from "./stickyMessageTypes";
import type { GuildTicketConfig, Ticket } from "./ticketTypes";
import type { VcRecruitConfig } from "./vcRecruitTypes";

/** ギルド設定のコアCRUD・locale操作 */
export interface IGuildCoreRepository {
  getConfig(guildId: string): Promise<GuildConfig | null>;
  saveConfig(config: GuildConfig): Promise<void>;
  updateConfig(guildId: string, updates: Partial<GuildConfig>): Promise<void>;
  deleteConfig(guildId: string): Promise<void>;
  exists(guildId: string): Promise<boolean>;
  getLocale(guildId: string): Promise<string>;
  updateLocale(guildId: string, locale: string): Promise<void>;
  updateErrorChannel(guildId: string, channelId: string): Promise<void>;
  resetGuildSettings(guildId: string): Promise<void>;
}

/** 全機能設定の一括取得・インポート・削除（エクスポート/reset-all 用） */
export interface IGuildConfigAggregateRepository {
  getFullConfig(guildId: string): Promise<FullGuildConfig | null>;
  importFullConfig(guildId: string, data: FullGuildConfig): Promise<void>;
  deleteAllConfigs(guildId: string): Promise<void>;
}

/** コア + 一括操作の統合インターフェース */
export interface IBaseGuildRepository
  extends IGuildCoreRepository,
    IGuildConfigAggregateRepository {}

/** エクスポート/インポート用の全設定統合型 */
export interface FullGuildConfig {
  locale: string;
  errorChannelId?: string;
  afk?: AfkConfig;
  bumpReminder?: BumpReminderConfig;
  vac?: Pick<VacConfig, "enabled" | "triggerChannelIds">;
  memberLog?: MemberLogConfig;
  vcRecruit?: VcRecruitConfig;
}

export interface IAfkConfigRepository {
  getAfkConfig(guildId: string): Promise<AfkConfig | null>;
  setAfkChannel(guildId: string, channelId: string): Promise<void>;
  updateAfkConfig(guildId: string, afkConfig: AfkConfig): Promise<void>;
}

export interface IBumpReminderConfigRepository {
  getBumpReminderConfig(guildId: string): Promise<BumpReminderConfig | null>;
  setBumpReminderEnabled(
    guildId: string,
    enabled: boolean,
    channelId?: string,
  ): Promise<void>;
  updateBumpReminderConfig(
    guildId: string,
    bumpReminderConfig: BumpReminderConfig,
  ): Promise<void>;
  setBumpReminderMentionRole(
    guildId: string,
    roleId: string | undefined,
  ): Promise<BumpReminderMentionRoleResult>;
  addBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserAddResult>;
  removeBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserRemoveResult>;
  clearBumpReminderMentionUsers(
    guildId: string,
  ): Promise<BumpReminderMentionUsersClearResult>;
  clearBumpReminderMentions(
    guildId: string,
  ): Promise<BumpReminderMentionClearResult>;
}

export interface IVacConfigRepository {
  getVacConfig(guildId: string): Promise<VacConfig | null>;
  updateVacConfig(guildId: string, vacConfig: VacConfig): Promise<void>;
}

export interface IMemberLogConfigRepository {
  getMemberLogConfig(guildId: string): Promise<MemberLogConfig | null>;
  updateMemberLogConfig(
    guildId: string,
    memberLogConfig: MemberLogConfig,
  ): Promise<void>;
}

export interface IVcRecruitConfigRepository {
  getVcRecruitConfig(guildId: string): Promise<VcRecruitConfig | null>;
  updateVcRecruitConfig(
    guildId: string,
    vcRecruitConfig: VcRecruitConfig,
  ): Promise<void>;
}

export interface IStickyMessageRepository {
  findByChannel(channelId: string): Promise<StickyMessage | null>;
  findAllByGuild(guildId: string): Promise<StickyMessage[]>;
  create(
    guildId: string,
    channelId: string,
    content: string,
    embedData?: string,
    updatedBy?: string,
  ): Promise<StickyMessage>;
  updateLastMessageId(id: string, lastMessageId: string): Promise<void>;
  updateContent(
    id: string,
    content: string,
    embedData: string | null,
    updatedBy?: string,
  ): Promise<StickyMessage>;
  delete(id: string): Promise<void>;
  deleteByChannel(channelId: string): Promise<number>;
}

export interface IReactionRolePanelRepository {
  findById(id: string): Promise<GuildReactionRolePanel | null>;
  findAllByGuild(guildId: string): Promise<GuildReactionRolePanel[]>;
  create(
    data: Omit<GuildReactionRolePanel, "id" | "createdAt" | "updatedAt">,
  ): Promise<GuildReactionRolePanel>;
  update(
    id: string,
    data: Partial<GuildReactionRolePanel>,
  ): Promise<GuildReactionRolePanel>;
  delete(id: string): Promise<void>;
  deleteAllByGuild(guildId: string): Promise<number>;
}

export interface IGuildTicketConfigRepository {
  findByGuildAndCategory(
    guildId: string,
    categoryId: string,
  ): Promise<GuildTicketConfig | null>;
  findAllByGuild(guildId: string): Promise<GuildTicketConfig[]>;
  create(config: GuildTicketConfig): Promise<GuildTicketConfig>;
  update(
    guildId: string,
    categoryId: string,
    data: Partial<GuildTicketConfig>,
  ): Promise<GuildTicketConfig>;
  delete(guildId: string, categoryId: string): Promise<void>;
  deleteAllByGuild(guildId: string): Promise<number>;
  incrementCounter(guildId: string, categoryId: string): Promise<number>;
}

export interface ITicketRepository {
  findById(id: string): Promise<Ticket | null>;
  findByChannelId(channelId: string): Promise<Ticket | null>;
  findOpenByUserAndCategory(
    guildId: string,
    categoryId: string,
    userId: string,
  ): Promise<Ticket[]>;
  findAllByCategory(guildId: string, categoryId: string): Promise<Ticket[]>;
  findOpenByCategory(guildId: string, categoryId: string): Promise<Ticket[]>;
  findAllClosedByGuild(guildId: string): Promise<Ticket[]>;
  create(data: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket>;
  update(id: string, data: Partial<Ticket>): Promise<Ticket>;
  delete(id: string): Promise<void>;
  deleteByCategory(guildId: string, categoryId: string): Promise<number>;
  deleteAllByGuild(guildId: string): Promise<number>;
}
