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
  UnverifiedKickSettings,
  VacSettings,
  VcAutoRecruitSettings,
} from "./entities";
import type {
  FullGuildState,
  ImportMergePlan,
} from "./guildSettingsExportTypes";
import type { GuildReactionRolePanel } from "./reactionRoleTypes";
import type { StickyEmbedData, StickyMessage } from "./stickyMessageTypes";
import type { GuildTicketSettings, Ticket } from "./ticketTypes";

/**
 * ギルド親レコード（guilds テーブル）の登録
 *
 * 全機能テーブルが guilds へ FK を張っているため、親行が無いギルドでは
 * どの機能の設定も保存できない。参加時と照合（起動時・日次）の2経路から呼ぶ。
 */
export interface IGuildRegistryRepository {
  /** 単一ギルドの親行を作る（既にあれば何もしない） */
  ensureGuild(guildId: string): Promise<void>;
  /** 複数ギルドの親行をまとめて作る（既にあるものは読み飛ばす） */
  ensureGuilds(guildIds: string[]): Promise<void>;
  /** 退出したギルドのデータ削除を予約する（親行が無ければ何もしない） */
  scheduleDeletion(guildId: string, deleteAt: Date): Promise<void>;
  /**
   * 削除予約を取り消す（再導入でデータを復活させる）
   * @returns 取り消した削除予定時刻。予約が無かった場合は null
   */
  cancelScheduledDeletion(guildId: string): Promise<Date | null>;
  /**
   * 複数ギルドの削除予約を取り消し、取り消した件数を返す
   * @returns 実際に予約が入っていて取り消した件数
   */
  cancelScheduledDeletions(guildIds: string[]): Promise<number>;
  /**
   * 参加中でないのに削除予約の無いギルドへ、削除を予約する
   *
   * `guildDelete` を取りこぼしたギルド（Bot の停止中に外された等）を拾うための照合。
   * 既に予約が入っているギルドの予定日時は動かさない。
   * @param joinedGuildIds いま参加しているギルドの ID（これ以外が対象）
   * @param deleteAt 書き込む削除予定時刻
   * @returns 新たに予約した件数
   */
  scheduleDeletionForAbsentGuilds(
    joinedGuildIds: string[],
    deleteAt: Date,
  ): Promise<number>;
  /** 猶予が切れたギルドの ID を列挙する */
  findGuildsDueForDeletion(now: Date): Promise<string[]>;
  /**
   * 猶予が切れたギルドを削除する（カスケードで全機能テーブルが落ちる）
   * @returns 実際に削除した件数
   */
  deleteGuildsDueForDeletion(guildIds: string[], now: Date): Promise<number>;
}

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
  vcAutoRecruit?: VcAutoRecruitSettings;
  unverifiedKick?: UnverifiedKickSettings;
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

export interface IVcAutoRecruitSettingsRepository {
  getVcAutoRecruitSettings(
    guildId: string,
  ): Promise<VcAutoRecruitSettings | null>;
  updateVcAutoRecruitSettings(
    guildId: string,
    vcAutoRecruitSettings: VcAutoRecruitSettings,
  ): Promise<void>;
}

export interface IUnverifiedKickSettingsRepository {
  getUnverifiedKickSettings(
    guildId: string,
  ): Promise<UnverifiedKickSettings | null>;
  updateUnverifiedKickSettings(
    guildId: string,
    unverifiedKickSettings: UnverifiedKickSettings,
  ): Promise<void>;
  /** 有効な全ギルドの設定を取得（日次チェック用） */
  getAllEnabled(): Promise<Array<UnverifiedKickSettings & { guildId: string }>>;
  /** 最終実行日を更新する（スイープ重複防止） */
  updateLastRunDate(guildId: string, date: string): Promise<void>;
  deleteUnverifiedKickSettings(guildId: string): Promise<void>;
}

/**
 * 未承認ユーザー自動キックの事前警告記録リポジトリ。
 * メンバー単位の warnedAt を保持し、未警告者のサイレントキックを防ぐ。
 */
export interface IUnverifiedKickWarnRepository {
  /** ギルドの全警告記録を userId → warnedAt のマップで取得する */
  getWarnedMap(guildId: string): Promise<Map<string, Date>>;
  /** 指定ユーザーを警告済みとして記録する（冪等・既存の warnedAt は据え置き） */
  recordWarned(
    guildId: string,
    userIds: string[],
    warnedAt: Date,
  ): Promise<void>;
  /** 指定ユーザーの警告記録を削除する（認証済み/退出/再参加による失効時） */
  deleteWarned(guildId: string, userIds: string[]): Promise<void>;
  /** ギルドの全警告記録を削除する（機能リセット/再有効化時のフレッシュスタート） */
  deleteAllByGuild(guildId: string): Promise<void>;
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
  delete(id: string, guildId?: string): Promise<void>;
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
