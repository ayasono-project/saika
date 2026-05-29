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
  AfkSettings,
  BumpReminderSettings,
  GuildSettings,
  MemberLogSettings,
  VacSettings,
} from "./entities";
import type {
  FullGuildState,
  ImportMergePlan,
} from "./guildSettingsExportTypes";
import type { GuildReactionRolePanel } from "./reactionRoleTypes";
import type { StickyEmbedData, StickyMessage } from "./stickyMessageTypes";
import type { GuildTicketSettings, Ticket } from "./ticketTypes";
import type { VcRecruitSettings } from "./vcRecruitTypes";

/** ギルド設定のコアCRUD・locale操作 */
export interface IGuildCoreRepository {
  getSettings(guildId: string): Promise<GuildSettings | null>;
  saveSettings(config: GuildSettings): Promise<void>;
  updateSettings(
    guildId: string,
    updates: Partial<GuildSettings>,
  ): Promise<void>;
  deleteSettings(guildId: string): Promise<void>;
  exists(guildId: string): Promise<boolean>;
  getLocale(guildId: string): Promise<string>;
  updateLocale(guildId: string, locale: string): Promise<void>;
  updateErrorChannel(guildId: string, channelId: string): Promise<void>;
  resetGuildSettings(guildId: string): Promise<void>;
}

/** 全機能設定の一括取得・インポート・削除（エクスポート/reset-all 用） */
export interface IGuildSettingsAggregateRepository {
  getFullSettings(guildId: string): Promise<FullGuildSettings | null>;
  importFullSettings(guildId: string, data: FullGuildSettings): Promise<void>;
  /** import 実行前にマージ計画（新規 insert 予定件数）を算出する */
  planImportMerge(
    guildId: string,
    data: FullGuildSettings,
  ): Promise<ImportMergePlan>;
  deleteAllSettings(guildId: string): Promise<void>;
}

/** コア + 一括操作の統合インターフェース */
export interface IBaseGuildRepository
  extends IGuildCoreRepository,
    IGuildSettingsAggregateRepository {}

/** エクスポート/インポート用の全設定統合型 */
export interface FullGuildSettings {
  locale: string;
  errorChannelId?: string;
  afk?: AfkSettings;
  bumpReminder?: BumpReminderSettings;
  vac?: Pick<VacSettings, "enabled" | "triggerChannelIds">;
  memberLog?: MemberLogSettings;
  vcRecruit?: VcRecruitSettings;
  /** stateful データ（チケット設定 / open チケット / スティッキー / リアクションロールパネル / VAC 作成済み VC） */
  state?: FullGuildState;
}

export interface IAfkSettingsRepository {
  getAfkSettings(guildId: string): Promise<AfkSettings | null>;
  setAfkChannel(guildId: string, channelId: string): Promise<void>;
  updateAfkSettings(guildId: string, afkSettings: AfkSettings): Promise<void>;
}

export interface IBumpReminderSettingsRepository {
  getBumpReminderSettings(
    guildId: string,
  ): Promise<BumpReminderSettings | null>;
  setBumpReminderEnabled(
    guildId: string,
    enabled: boolean,
    channelId?: string,
  ): Promise<void>;
  updateBumpReminderSettings(
    guildId: string,
    bumpReminderSettings: BumpReminderSettings,
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

export interface IVacSettingsRepository {
  getVacSettings(guildId: string): Promise<VacSettings | null>;
  updateVacSettings(guildId: string, vacSettings: VacSettings): Promise<void>;
}

export interface IMemberLogSettingsRepository {
  getMemberLogSettings(guildId: string): Promise<MemberLogSettings | null>;
  updateMemberLogSettings(
    guildId: string,
    memberLogSettings: MemberLogSettings,
  ): Promise<void>;
}

export interface IVcRecruitSettingsRepository {
  getVcRecruitSettings(guildId: string): Promise<VcRecruitSettings | null>;
  updateVcRecruitSettings(
    guildId: string,
    vcRecruitSettings: VcRecruitSettings,
  ): Promise<void>;
}

export interface IStickyMessageRepository {
  findByChannel(channelId: string): Promise<StickyMessage | null>;
  findAllByGuild(guildId: string): Promise<StickyMessage[]>;
  create(
    guildId: string,
    channelId: string,
    content: string,
    embedData?: StickyEmbedData,
    updatedBy?: string,
  ): Promise<StickyMessage>;
  updateLastMessageId(id: string, lastMessageId: string): Promise<void>;
  updateContent(
    id: string,
    content: string,
    embedData: StickyEmbedData | null,
    updatedBy?: string,
  ): Promise<StickyMessage>;
  delete(id: string): Promise<void>;
  deleteByChannel(channelId: string): Promise<number>;
}

export interface IReactionRolePanelRepository {
  findById(id: string): Promise<GuildReactionRolePanel | null>;
  /** パネルが貼られているメッセージ ID で取得する（ライブボタンの特定に使う） */
  findByMessageId(messageId: string): Promise<GuildReactionRolePanel | null>;
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

export interface IGuildTicketSettingsRepository {
  findByGuildAndCategory(
    guildId: string,
    categoryId: string,
  ): Promise<GuildTicketSettings | null>;
  findAllByGuild(guildId: string): Promise<GuildTicketSettings[]>;
  create(config: GuildTicketSettings): Promise<GuildTicketSettings>;
  update(
    guildId: string,
    categoryId: string,
    data: Partial<GuildTicketSettings>,
  ): Promise<GuildTicketSettings>;
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
  findAllOpenByGuild(guildId: string): Promise<Ticket[]>;
  findAllClosedByGuild(guildId: string): Promise<Ticket[]>;
  create(data: Omit<Ticket, "id" | "createdAt" | "updatedAt">): Promise<Ticket>;
  update(id: string, data: Partial<Ticket>): Promise<Ticket>;
  delete(id: string): Promise<void>;
  deleteByCategory(guildId: string, categoryId: string): Promise<number>;
  deleteAllByGuild(guildId: string): Promise<number>;
}
