// src/shared/database/repositories/guildConfigAggregateRepository.ts
// ギルド設定一括操作リポジトリ（エクスポート/インポート/reset-all）

import type { PrismaClient } from "@prisma/client";
import type {
  FullGuildConfig,
  IAfkConfigRepository,
  IBumpReminderConfigRepository,
  IGuildConfigAggregateRepository,
  IGuildCoreRepository,
  IGuildTicketConfigRepository,
  IMemberLogConfigRepository,
  ImportMergePlan,
  IReactionRolePanelRepository,
  IStickyMessageRepository,
  ITicketRepository,
  IVacConfigRepository,
  IVcRecruitConfigRepository,
} from "../types";
import {
  fromOpenTicketExport,
  fromReactionRolePanelExport,
  fromStickyMessageExport,
  fromTicketConfigExport,
  mergeVacCreatedChannels,
  toOpenTicketExport,
  toReactionRolePanelExport,
  toStickyMessageExport,
  toTicketConfigExport,
} from "./serializers/guildStateSerializer";

/**
 * 全機能設定の一括取得・インポート・削除を担当するリポジトリ
 * 各スタンドアロンリポジトリを集約して横断操作を提供する
 */
export class GuildConfigAggregateRepository
  implements IGuildConfigAggregateRepository
{
  private readonly coreRepo: IGuildCoreRepository;
  private readonly afkRepo: IAfkConfigRepository;
  private readonly bumpReminderRepo: IBumpReminderConfigRepository;
  private readonly vacRepo: IVacConfigRepository;
  private readonly memberLogRepo: IMemberLogConfigRepository;
  private readonly vcRecruitRepo: IVcRecruitConfigRepository;
  private readonly stickyMessageRepo: IStickyMessageRepository;
  private readonly reactionRolePanelRepo: IReactionRolePanelRepository;
  private readonly ticketConfigRepo: IGuildTicketConfigRepository;
  private readonly ticketRepo: ITicketRepository;
  private readonly prisma: PrismaClient;

  constructor(
    coreRepo: IGuildCoreRepository,
    afkRepo: IAfkConfigRepository,
    bumpReminderRepo: IBumpReminderConfigRepository,
    vacRepo: IVacConfigRepository,
    memberLogRepo: IMemberLogConfigRepository,
    vcRecruitRepo: IVcRecruitConfigRepository,
    stickyMessageRepo: IStickyMessageRepository,
    reactionRolePanelRepo: IReactionRolePanelRepository,
    ticketConfigRepo: IGuildTicketConfigRepository,
    ticketRepo: ITicketRepository,
    prisma: PrismaClient,
  ) {
    this.coreRepo = coreRepo;
    this.afkRepo = afkRepo;
    this.bumpReminderRepo = bumpReminderRepo;
    this.vacRepo = vacRepo;
    this.memberLogRepo = memberLogRepo;
    this.vcRecruitRepo = vcRecruitRepo;
    this.stickyMessageRepo = stickyMessageRepo;
    this.reactionRolePanelRepo = reactionRolePanelRepo;
    this.ticketConfigRepo = ticketConfigRepo;
    this.ticketRepo = ticketRepo;
    this.prisma = prisma;
  }

  /**
   * エクスポート用に全機能の設定と stateful データを一括取得する
   */
  async getFullConfig(guildId: string): Promise<FullGuildConfig | null> {
    const config = await this.coreRepo.getConfig(guildId);
    if (!config) return null;

    const [
      afk,
      bumpReminder,
      vac,
      memberLog,
      vcRecruit,
      ticketConfigs,
      openTickets,
      stickyMessages,
      reactionRolePanels,
    ] = await Promise.all([
      this.afkRepo.getAfkConfig(guildId),
      this.bumpReminderRepo.getBumpReminderConfig(guildId),
      this.vacRepo.getVacConfig(guildId),
      this.memberLogRepo.getMemberLogConfig(guildId),
      this.vcRecruitRepo.getVcRecruitConfig(guildId),
      this.ticketConfigRepo.findAllByGuild(guildId),
      this.ticketRepo.findAllOpenByGuild(guildId),
      this.stickyMessageRepo.findAllByGuild(guildId),
      this.reactionRolePanelRepo.findAllByGuild(guildId),
    ]);

    const result: FullGuildConfig = {
      locale: config.locale,
      errorChannelId: config.errorChannelId,
    };

    if (afk) result.afk = afk;
    if (bumpReminder) result.bumpReminder = bumpReminder;
    // VAC は triggerChannelIds のみ config 側に格納（createdChannels は state 側へ）
    if (vac)
      result.vac = {
        enabled: vac.enabled,
        triggerChannelIds: vac.triggerChannelIds,
      };
    if (memberLog) result.memberLog = memberLog;
    if (vcRecruit) {
      // setups[].createdVoiceChannelIds はランタイム追跡情報のため export 対象外
      result.vcRecruit = {
        ...vcRecruit,
        setups: vcRecruit.setups.map((s) => ({
          ...s,
          createdVoiceChannelIds: [],
        })),
      };
    }

    result.state = {
      ticketConfigs: ticketConfigs.map(toTicketConfigExport),
      openTickets: openTickets.map(toOpenTicketExport),
      stickyMessages: stickyMessages.map(toStickyMessageExport),
      reactionRolePanels: reactionRolePanels.map(toReactionRolePanelExport),
      vacCreatedChannels: vac ? vac.createdChannels : [],
    };

    return result;
  }

  /**
   * インポート計画を算出する（確認ダイアログの「新規追加予定件数」表示用）
   * 設定系は常に上書きするためカウントしない。stateful のみマージキーで既存判定する。
   */
  async planImportMerge(
    guildId: string,
    data: FullGuildConfig,
  ): Promise<ImportMergePlan> {
    if (!data.state) {
      return {
        ticketConfigsToInsert: 0,
        openTicketsToInsert: 0,
        stickyMessagesToInsert: 0,
        reactionRolePanelsToInsert: 0,
        vacCreatedChannelsToInsert: 0,
      };
    }

    const [
      existingTicketConfigs,
      existingOpenTickets,
      existingStickys,
      existingReactionPanels,
      existingVac,
    ] = await Promise.all([
      this.ticketConfigRepo.findAllByGuild(guildId),
      this.ticketRepo.findAllOpenByGuild(guildId),
      this.stickyMessageRepo.findAllByGuild(guildId),
      this.reactionRolePanelRepo.findAllByGuild(guildId),
      this.vacRepo.getVacConfig(guildId),
    ]);

    const ticketConfigKeys = new Set(
      existingTicketConfigs.map((c) => c.categoryId),
    );
    const openTicketKeys = new Set(existingOpenTickets.map((t) => t.channelId));
    const stickyKeys = new Set(existingStickys.map((s) => s.channelId));
    const reactionPanelKeys = new Set(
      existingReactionPanels.map((p) => `${p.channelId}:${p.messageId}`),
    );
    const vacKeys = new Set(
      (existingVac?.createdChannels ?? []).map((c) => c.voiceChannelId),
    );

    return {
      ticketConfigsToInsert: data.state.ticketConfigs.filter(
        (c) => !ticketConfigKeys.has(c.categoryId),
      ).length,
      openTicketsToInsert: data.state.openTickets.filter(
        (t) => !openTicketKeys.has(t.channelId),
      ).length,
      stickyMessagesToInsert: data.state.stickyMessages.filter(
        (s) => !stickyKeys.has(s.channelId),
      ).length,
      reactionRolePanelsToInsert: data.state.reactionRolePanels.filter(
        (p) => !reactionPanelKeys.has(`${p.channelId}:${p.messageId}`),
      ).length,
      vacCreatedChannelsToInsert: data.state.vacCreatedChannels.filter(
        (c) => !vacKeys.has(c.voiceChannelId),
      ).length,
    };
  }

  /**
   * インポートデータから全機能の設定を保存する。
   * 設定系（config.*）= 上書き、stateful（state.*）= 既存優先 + 欠落分のみ insert。
   * 全体を単一トランザクションでラップし、部分失敗時は全体をロールバックする。
   */
  async importFullConfig(
    guildId: string,
    data: FullGuildConfig,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // ── 設定系: 上書き ─────────────────────────────────
      await tx.guildConfig.update({
        where: { guildId },
        data: {
          locale: data.locale,
          errorChannelId: data.errorChannelId ?? null,
        },
      });

      if (data.afk) {
        await tx.guildAfkConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: data.afk.enabled,
            channelId: data.afk.channelId ?? null,
          },
          update: {
            enabled: data.afk.enabled,
            channelId: data.afk.channelId ?? null,
          },
        });
      }

      if (data.bumpReminder) {
        await tx.guildBumpReminderConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: data.bumpReminder.enabled,
            channelId: data.bumpReminder.channelId ?? null,
            mentionRoleId: data.bumpReminder.mentionRoleId ?? null,
            mentionUserIds: JSON.stringify(data.bumpReminder.mentionUserIds),
          },
          update: {
            enabled: data.bumpReminder.enabled,
            channelId: data.bumpReminder.channelId ?? null,
            mentionRoleId: data.bumpReminder.mentionRoleId ?? null,
            mentionUserIds: JSON.stringify(data.bumpReminder.mentionUserIds),
          },
        });
      }

      if (data.memberLog) {
        await tx.guildMemberLogConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: data.memberLog.enabled,
            channelId: data.memberLog.channelId ?? null,
            joinMessage: data.memberLog.joinMessage ?? null,
            leaveMessage: data.memberLog.leaveMessage ?? null,
          },
          update: {
            enabled: data.memberLog.enabled,
            channelId: data.memberLog.channelId ?? null,
            joinMessage: data.memberLog.joinMessage ?? null,
            leaveMessage: data.memberLog.leaveMessage ?? null,
          },
        });
      }

      if (data.vcRecruit) {
        // setups[].createdVoiceChannelIds は空配列で書き込む（ランタイム情報のため）
        const setupsForDb = data.vcRecruit.setups.map((s) => ({
          ...s,
          createdVoiceChannelIds: [],
        }));
        await tx.guildVcRecruitConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: data.vcRecruit.enabled,
            mentionRoleIds: JSON.stringify(data.vcRecruit.mentionRoleIds),
            setups: JSON.stringify(setupsForDb),
          },
          update: {
            enabled: data.vcRecruit.enabled,
            mentionRoleIds: JSON.stringify(data.vcRecruit.mentionRoleIds),
            setups: JSON.stringify(setupsForDb),
          },
        });
      }

      // VAC: 設定系（enabled / triggerChannelIds）は上書き、createdChannels は stateful 扱いで union マージ
      if (data.vac || data.state?.vacCreatedChannels?.length) {
        const existing = await tx.guildVacConfig.findUnique({
          where: { guildId },
        });
        const existingCreated: { voiceChannelId: string }[] = existing
          ? safeParseArray(existing.createdChannels)
          : [];
        const incomingCreated = data.state?.vacCreatedChannels ?? [];
        const mergedCreated = mergeVacCreatedChannels(
          existingCreated as ReturnType<typeof mergeVacCreatedChannels>,
          incomingCreated,
        );
        const settings = data.vac ?? {
          enabled: existing?.enabled ?? false,
          triggerChannelIds: existing
            ? safeParseArray<string>(existing.triggerChannelIds)
            : [],
        };
        await tx.guildVacConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: settings.enabled,
            triggerChannelIds: JSON.stringify(settings.triggerChannelIds),
            createdChannels: JSON.stringify(mergedCreated),
          },
          update: {
            enabled: settings.enabled,
            triggerChannelIds: JSON.stringify(settings.triggerChannelIds),
            createdChannels: JSON.stringify(mergedCreated),
          },
        });
      }

      // ── stateful: 既存優先 + 欠落分のみ insert ─────────────
      if (!data.state) return;

      // GuildTicketConfig: (guildId, categoryId) で既存判定
      for (const cfg of data.state.ticketConfigs) {
        const exists = await tx.guildTicketConfig.findUnique({
          where: {
            guildId_categoryId: { guildId, categoryId: cfg.categoryId },
          },
        });
        if (exists) continue;
        await tx.guildTicketConfig.create({
          data: fromTicketConfigExport(guildId, cfg),
        });
      }

      // Ticket (open): channelId で既存判定
      for (const ticket of data.state.openTickets) {
        const exists = await tx.ticket.findFirst({
          where: { channelId: ticket.channelId, status: "open" },
        });
        if (exists) continue;
        await tx.ticket.create({
          data: fromOpenTicketExport(guildId, ticket),
        });
      }

      // StickyMessage: channelId で既存判定（DB スキーマで unique）
      for (const sticky of data.state.stickyMessages) {
        const exists = await tx.stickyMessage.findUnique({
          where: { channelId: sticky.channelId },
        });
        if (exists) continue;
        await tx.stickyMessage.create({
          data: fromStickyMessageExport(guildId, sticky),
        });
      }

      // GuildReactionRolePanel: (channelId, messageId) で既存判定
      for (const panel of data.state.reactionRolePanels) {
        const exists = await tx.guildReactionRolePanel.findFirst({
          where: {
            guildId,
            channelId: panel.channelId,
            messageId: panel.messageId,
          },
        });
        if (exists) continue;
        await tx.guildReactionRolePanel.create({
          data: fromReactionRolePanelExport(guildId, panel),
        });
      }
    });
  }

  /**
   * ギルド設定と全機能設定を一括削除する（reset-all 用）
   * トランザクションで一括実行し、中途半端な削除状態を防止する
   */
  async deleteAllConfigs(guildId: string): Promise<void> {
    // deleteMany は該当レコードなしでも例外を投げないため、個別エラー処理不要
    await this.prisma.$transaction([
      this.prisma.ticket.deleteMany({ where: { guildId } }),
      this.prisma.guildTicketConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildReactionRolePanel.deleteMany({ where: { guildId } }),
      this.prisma.stickyMessage.deleteMany({ where: { guildId } }),
      this.prisma.guildBumpReminderConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildAfkConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildVacConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildMemberLogConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildVcRecruitConfig.deleteMany({ where: { guildId } }),
      this.prisma.guildConfig.deleteMany({ where: { guildId } }),
    ]);
  }
}

/** トランザクション内で JSON 文字列を配列にパースする（ロガー依存を持たない軽量版） */
function safeParseArray<T>(json: string): T[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
