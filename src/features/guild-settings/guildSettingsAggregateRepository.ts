// ギルド設定一括操作リポジトリ（エクスポート/インポート/reset-all）

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  FullGuildSettings,
  IAfkSettingsRepository,
  IBumpReminderSettingsRepository,
  IGuildCoreRepository,
  IGuildSettingsAggregateRepository,
  IGuildTicketSettingsRepository,
  IMemberLogSettingsRepository,
  ImportMergePlan,
  IReactionRolePanelRepository,
  IStickyMessageRepository,
  ITicketRepository,
  IUnverifiedKickSettingsRepository,
  IVacSettingsRepository,
  IVcAutoRecruitSettingsRepository,
} from "../../shared/database/types";
import {
  fromOpenTicketExport,
  fromReactionRolePanelExport,
  fromStickyMessageExport,
  fromTicketSettingsExport,
  mergeVacCreatedChannels,
  toOpenTicketExport,
  toReactionRolePanelExport,
  toStickyMessageExport,
  toTicketSettingsExport,
} from "./serializers/guildStateSerializer";

/**
 * 全機能設定の一括取得・インポート・削除を担当するリポジトリ
 * 各スタンドアロンリポジトリを集約して横断操作を提供する
 */
export class GuildSettingsAggregateRepository
  implements IGuildSettingsAggregateRepository
{
  private readonly coreRepo: IGuildCoreRepository;
  private readonly afkRepo: IAfkSettingsRepository;
  private readonly bumpReminderRepo: IBumpReminderSettingsRepository;
  private readonly vacRepo: IVacSettingsRepository;
  private readonly memberLogRepo: IMemberLogSettingsRepository;
  private readonly vcAutoRecruitRepo: IVcAutoRecruitSettingsRepository;
  private readonly unverifiedKickRepo: IUnverifiedKickSettingsRepository;
  private readonly stickyMessageRepo: IStickyMessageRepository;
  private readonly reactionRolePanelRepo: IReactionRolePanelRepository;
  private readonly ticketSettingsRepo: IGuildTicketSettingsRepository;
  private readonly ticketRepo: ITicketRepository;
  private readonly prisma: PrismaClient;

  constructor(
    coreRepo: IGuildCoreRepository,
    afkRepo: IAfkSettingsRepository,
    bumpReminderRepo: IBumpReminderSettingsRepository,
    vacRepo: IVacSettingsRepository,
    memberLogRepo: IMemberLogSettingsRepository,
    vcAutoRecruitRepo: IVcAutoRecruitSettingsRepository,
    unverifiedKickRepo: IUnverifiedKickSettingsRepository,
    stickyMessageRepo: IStickyMessageRepository,
    reactionRolePanelRepo: IReactionRolePanelRepository,
    ticketSettingsRepo: IGuildTicketSettingsRepository,
    ticketRepo: ITicketRepository,
    prisma: PrismaClient,
  ) {
    this.coreRepo = coreRepo;
    this.afkRepo = afkRepo;
    this.bumpReminderRepo = bumpReminderRepo;
    this.vacRepo = vacRepo;
    this.memberLogRepo = memberLogRepo;
    this.vcAutoRecruitRepo = vcAutoRecruitRepo;
    this.unverifiedKickRepo = unverifiedKickRepo;
    this.stickyMessageRepo = stickyMessageRepo;
    this.reactionRolePanelRepo = reactionRolePanelRepo;
    this.ticketSettingsRepo = ticketSettingsRepo;
    this.ticketRepo = ticketRepo;
    this.prisma = prisma;
  }

  /**
   * エクスポート用に全機能の設定と stateful データを一括取得する
   */
  async getFullSettings(guildId: string): Promise<FullGuildSettings | null> {
    const config = await this.coreRepo.getSettings(guildId);
    if (!config) return null;

    const [
      afk,
      bumpReminder,
      vac,
      memberLog,
      vcAutoRecruit,
      unverifiedKick,
      ticketSettings,
      openTickets,
      stickyMessages,
      reactionRolePanels,
    ] = await Promise.all([
      this.afkRepo.getAfkSettings(guildId),
      this.bumpReminderRepo.getBumpReminderSettings(guildId),
      this.vacRepo.getVacSettings(guildId),
      this.memberLogRepo.getMemberLogSettings(guildId),
      this.vcAutoRecruitRepo.getVcAutoRecruitSettings(guildId),
      this.unverifiedKickRepo.getUnverifiedKickSettings(guildId),
      this.ticketSettingsRepo.findAllByGuild(guildId),
      this.ticketRepo.findAllOpenByGuild(guildId),
      this.stickyMessageRepo.findAllByGuild(guildId),
      this.reactionRolePanelRepo.findAllByGuild(guildId),
    ]);

    const result: FullGuildSettings = {
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
    if (vcAutoRecruit) {
      // activeInvites は投稿中募集のランタイム参照のため export 対象外
      result.vcAutoRecruit = { ...vcAutoRecruit, activeInvites: [] };
    }
    if (unverifiedKick) result.unverifiedKick = unverifiedKick;

    result.state = {
      ticketSettings: ticketSettings.map(toTicketSettingsExport),
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
    data: FullGuildSettings,
  ): Promise<ImportMergePlan> {
    if (!data.state) {
      return {
        ticketSettingsToInsert: 0,
        openTicketsToInsert: 0,
        stickyMessagesToInsert: 0,
        reactionRolePanelsToInsert: 0,
        vacCreatedChannelsToInsert: 0,
      };
    }

    const [
      existingTicketSettings,
      existingOpenTickets,
      existingStickys,
      existingReactionPanels,
      existingVac,
    ] = await Promise.all([
      this.ticketSettingsRepo.findAllByGuild(guildId),
      this.ticketRepo.findAllOpenByGuild(guildId),
      this.stickyMessageRepo.findAllByGuild(guildId),
      this.reactionRolePanelRepo.findAllByGuild(guildId),
      this.vacRepo.getVacSettings(guildId),
    ]);

    const ticketSettingsKeys = new Set(
      existingTicketSettings.map((c) => c.categoryId),
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
      ticketSettingsToInsert: data.state.ticketSettings.filter(
        (c) => !ticketSettingsKeys.has(c.categoryId),
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
  async importFullSettings(
    guildId: string,
    data: FullGuildSettings,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // ── 設定系: 上書き ─────────────────────────────────
      // 空 DB への初回 import（DB 移行）ではコア行が未作成なので upsert で作る
      await tx.guildSettings.upsert({
        where: { guildId },
        create: {
          guildId,
          locale: data.locale,
          errorChannelId: data.errorChannelId ?? null,
        },
        update: {
          locale: data.locale,
          errorChannelId: data.errorChannelId ?? null,
        },
      });

      if (data.afk) {
        await tx.guildAfkSettings.upsert({
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
        await tx.guildBumpReminderSettings.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: data.bumpReminder.enabled,
            channelId: data.bumpReminder.channelId ?? null,
            mentionRoleId: data.bumpReminder.mentionRoleId ?? null,
            mentionUserIds: data.bumpReminder.mentionUserIds,
          },
          update: {
            enabled: data.bumpReminder.enabled,
            channelId: data.bumpReminder.channelId ?? null,
            mentionRoleId: data.bumpReminder.mentionRoleId ?? null,
            mentionUserIds: data.bumpReminder.mentionUserIds,
          },
        });
      }

      if (data.memberLog) {
        await tx.guildMemberLogSettings.upsert({
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

      if (data.vcAutoRecruit) {
        // activeInvites は空配列で書き込む（投稿中募集のランタイム参照のため）
        const vcAutoRecruitData = {
          enabled: data.vcAutoRecruit.enabled,
          channelId: data.vcAutoRecruit.channelId ?? null,
          message: data.vcAutoRecruit.message ?? null,
          embedEnabled: data.vcAutoRecruit.embedEnabled,
          enabledChannelIds: data.vcAutoRecruit
            .enabledChannelIds as unknown as Prisma.InputJsonValue,
          activeInvites: [] as unknown as Prisma.InputJsonValue,
        };
        await tx.guildVcAutoRecruitSettings.upsert({
          where: { guildId },
          create: { guildId, ...vcAutoRecruitData },
          update: vcAutoRecruitData,
        });
      }

      if (data.unverifiedKick) {
        // enabledAt は export JSON で ISO 文字列化されるため import 時に Date へ正規化する
        const unverifiedKickData = {
          enabled: data.unverifiedKick.enabled,
          enabledAt: data.unverifiedKick.enabledAt
            ? new Date(data.unverifiedKick.enabledAt)
            : null,
          verifiedRoleId: data.unverifiedKick.verifiedRoleId ?? null,
          graceDays: data.unverifiedKick.graceDays,
          warnDays: data.unverifiedKick.warnDays ?? null,
          notifyChannelId: data.unverifiedKick.notifyChannelId ?? null,
          logChannelId: data.unverifiedKick.logChannelId ?? null,
          markerRoleId: data.unverifiedKick.markerRoleId ?? null,
          dmTemplate: data.unverifiedKick.dmTemplate ?? null,
          notifyTemplate: data.unverifiedKick.notifyTemplate ?? null,
          exemptRoleIds: data.unverifiedKick.exemptRoleIds,
          timezone: data.unverifiedKick.timezone,
          runHour: data.unverifiedKick.runHour,
          mentionEnabled: data.unverifiedKick.mentionEnabled,
        };
        await tx.guildUnverifiedKickSettings.upsert({
          where: { guildId },
          create: { guildId, ...unverifiedKickData },
          update: unverifiedKickData,
        });
      }

      // VAC: 設定系（enabled / triggerChannelIds）は上書き、createdChannels は stateful 扱いで union マージ
      if (data.vac || data.state?.vacCreatedChannels?.length) {
        const existing = await tx.guildVacSettings.findUnique({
          where: { guildId },
        });
        const existingCreated = (existing?.createdChannels ??
          []) as unknown as { voiceChannelId: string }[];
        const incomingCreated = data.state?.vacCreatedChannels ?? [];
        const mergedCreated = mergeVacCreatedChannels(
          existingCreated as ReturnType<typeof mergeVacCreatedChannels>,
          incomingCreated,
        );
        const settings = data.vac ?? {
          enabled: existing?.enabled ?? false,
          triggerChannelIds: (existing?.triggerChannelIds ?? []) as string[],
        };
        await tx.guildVacSettings.upsert({
          where: { guildId },
          create: {
            guildId,
            enabled: settings.enabled,
            triggerChannelIds: settings.triggerChannelIds,
            createdChannels: mergedCreated as unknown as Prisma.InputJsonValue,
          },
          update: {
            enabled: settings.enabled,
            triggerChannelIds: settings.triggerChannelIds,
            createdChannels: mergedCreated as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // ── stateful: 既存優先 + 欠落分のみ insert ─────────────
      if (!data.state) return;

      // GuildTicketSettings: (guildId, categoryId) で既存判定
      for (const cfg of data.state.ticketSettings) {
        const exists = await tx.guildTicketSettings.findUnique({
          where: {
            guildId_categoryId: { guildId, categoryId: cfg.categoryId },
          },
        });
        if (exists) continue;
        await tx.guildTicketSettings.create({
          data: fromTicketSettingsExport(guildId, cfg),
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
        const stickyData = fromStickyMessageExport(guildId, sticky);
        await tx.stickyMessage.create({
          data: {
            ...stickyData,
            embedData: stickyData.embedData
              ? (stickyData.embedData as Prisma.InputJsonValue)
              : Prisma.DbNull,
          },
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
        const panelData = fromReactionRolePanelExport(guildId, panel);
        await tx.guildReactionRolePanel.create({
          data: {
            ...panelData,
            buttons: panelData.buttons as unknown as Prisma.InputJsonValue,
          },
        });
      }
    });
  }

  /**
   * ギルド設定と全機能設定を一括削除する（reset-all 用）
   *
   * `guilds` の親行を削除し、FK の `onDelete: Cascade` で全機能テーブルを落とす。
   * **Bot はまだこのギルドに居る**ので、親行は同じ `joinedAt` で作り直して登録を
   * 保つ（親行が無いと以降どの設定も保存できない）。削除と再作成は同一
   * トランザクションで行い、途中で失敗しても登録が失われないようにしている。
   *
   * テーブルを個別に列挙する実装をやめたのは、テーブルを増やすたびに列挙漏れが
   * 起きる構造だったため（2026-09-20 にチケット・リアクションロール・未承認キック・
   * VC自動募集の4つが抜けているのを見つけて直した）。カスケードなら新しい
   * ギルド単位テーブルは FK を張るだけで自動的に対象になる。
   *
   * **削除対象が変わったら `guildSettings:embed.field.value.reset_all_target` も
   * 直すこと。** あれは取り消せない操作の確認ダイアログに出る削除対象の一覧で、
   * 実際に消すものより少なく書くと利用者を騙すことになる。
   * @param guildId 対象ギルドID
   * @returns 実行完了を示す Promise
   */
  async deleteAllSettings(guildId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.guild.findUnique({ where: { guildId } });
      // 親行が無ければ FK により子行も存在しえないため、消すものがない
      if (!existing) return;

      // 削除予約も引き継ぐ。通常は Bot が参加中なので予約は無いが、退出済みギルドで
      // 落とすと、次の照合で改めて30日後に予約され、元の期限より削除が遅れる
      await tx.guild.delete({ where: { guildId } });
      await tx.guild.create({
        data: {
          guildId,
          joinedAt: existing.joinedAt,
          scheduledDeletionAt: existing.scheduledDeletionAt,
        },
      });
    });
  }
}
