// src/bot/services/botCompositionRoot.ts
// Bot層の依存解決を集約する Composition Root

import type { PrismaClient } from "@prisma/client";
import { getAfkSettingsRepository } from "../../shared/database/repositories/afkSettingsRepository";
import { getBumpReminderSettingsRepository } from "../../shared/database/repositories/bumpReminderSettingsRepository";
import { getGuildCoreRepository } from "../../shared/database/repositories/guildCoreRepository";
import { GuildSettingsAggregateRepository } from "../../shared/database/repositories/guildSettingsAggregateRepository";
import { getMemberLogSettingsRepository } from "../../shared/database/repositories/memberLogSettingsRepository";
import { getReactionRolePanelRepository } from "../../shared/database/repositories/reactionRolePanelRepository";
import { getTicketSettingsRepository } from "../../shared/database/repositories/ticketSettingsRepository";
import { getVacSettingsRepository } from "../../shared/database/repositories/vacSettingsRepository";
import { getVcRecruitSettingsRepository } from "../../shared/database/repositories/vcRecruitSettingsRepository";
import type { ITicketRepository } from "../../shared/database/types";
import type { BumpReminderSettingsService } from "../../shared/features/bump-reminder/bumpReminderSettingsService";
import type { GuildSettingsService } from "../../shared/features/guild-settings/guildSettingsService";
import { createGuildSettingsService } from "../../shared/features/guild-settings/guildSettingsService";
import type { MemberLogSettingsService } from "../../shared/features/member-log/memberLogSettingsService";
import { createMemberLogSettingsService } from "../../shared/features/member-log/memberLogSettingsService";
import type { ReactionRolePanelSettingsService } from "../../shared/features/reaction-role/reactionRolePanelSettingsService";
import { createReactionRolePanelSettingsService } from "../../shared/features/reaction-role/reactionRolePanelSettingsService";
import type { StickyMessageSettingsService } from "../../shared/features/sticky-message/stickyMessageSettingsService";
import { createStickyMessageSettingsService } from "../../shared/features/sticky-message/stickyMessageSettingsService";
import type { TicketSettingsService } from "../../shared/features/ticket/ticketSettingsService";
import { createTicketSettingsService } from "../../shared/features/ticket/ticketSettingsService";
import type { VacSettingsService } from "../../shared/features/vac/vacSettingsService";
import { createVacSettingsService } from "../../shared/features/vac/vacSettingsService";
import { createVcRecruitSettingsService } from "../../shared/features/vc-recruit/vcRecruitSettingsService";
import { localeManager } from "../../shared/locale/localeManager";
import { createBotServiceAccessor } from "../../shared/utils/serviceFactory";
import { getBumpReminderRepository } from "../features/bump-reminder/repositories/bumpReminderRepository";
import type { IBumpReminderRepository as BumpReminderRepositoryType } from "../features/bump-reminder/repositories/types";
import type { BumpReminderManager } from "../features/bump-reminder/services/bumpReminderService";
import { getBumpReminderManager } from "../features/bump-reminder/services/bumpReminderService";
import { createBumpReminderFeatureSettingsService } from "../features/bump-reminder/services/bumpReminderSettingsServiceResolver";
import { getStickyMessageRepository } from "../features/sticky-message/repositories/stickyMessageRepository";
import type { StickyMessageResendService } from "../features/sticky-message/services/stickyMessageResendService";
import { getStickyMessageResendService } from "../features/sticky-message/services/stickyMessageResendService";
import { getTicketRepository } from "../features/ticket/repositories/ticketRepository";
import type { VacService } from "../features/vac/services/vacService";
import { getVacService } from "../features/vac/services/vacService";
import { registerVcPanelOwnershipChecker } from "../features/vc-panel/vcPanelOwnershipRegistry";
import type { IVcRecruitRepository } from "../features/vc-recruit/repositories/vcRecruitRepository";
import { createVcRecruitRepository } from "../features/vc-recruit/repositories/vcRecruitRepository";

// ---------------------------------------------------------------------------
// BotServices interface
// ---------------------------------------------------------------------------

export interface BotServices {
  guildSettingsService: GuildSettingsService;
  bumpReminderSettingsService: BumpReminderSettingsService;
  bumpReminderRepository: BumpReminderRepositoryType;
  bumpReminderManager: BumpReminderManager;
  vacSettingsService: VacSettingsService;
  vacService: VacService;
  stickyMessageSettingsService: StickyMessageSettingsService;
  stickyMessageResendService: StickyMessageResendService;
  memberLogSettingsService: MemberLogSettingsService;
  ticketSettingsService: TicketSettingsService;
  ticketRepository: ITicketRepository;
  reactionRolePanelSettingsService: ReactionRolePanelSettingsService;
  vcRecruitRepository: IVcRecruitRepository;
}

// ---------------------------------------------------------------------------
// Module-level singletons
// ---------------------------------------------------------------------------

const _guildSettingsServiceAccessor =
  createBotServiceAccessor<GuildSettingsService>("GuildSettingsService");
export const getBotGuildSettingsService: () => GuildSettingsService =
  _guildSettingsServiceAccessor[0];
export const setBotGuildSettingsService: (value: GuildSettingsService) => void =
  _guildSettingsServiceAccessor[1];

const _bumpReminderSettingsServiceAccessor =
  createBotServiceAccessor<BumpReminderSettingsService>(
    "BumpReminderSettingsService",
  );
export const getBotBumpReminderSettingsService: () => BumpReminderSettingsService =
  _bumpReminderSettingsServiceAccessor[0];
export const setBotBumpReminderSettingsService: (
  value: BumpReminderSettingsService,
) => void = _bumpReminderSettingsServiceAccessor[1];

const _bumpReminderRepositoryAccessor =
  createBotServiceAccessor<BumpReminderRepositoryType>(
    "BumpReminderRepository",
  );
export const getBotBumpReminderRepository: () => BumpReminderRepositoryType =
  _bumpReminderRepositoryAccessor[0];
export const setBotBumpReminderRepository: (
  value: BumpReminderRepositoryType,
) => void = _bumpReminderRepositoryAccessor[1];

const _bumpReminderManagerAccessor =
  createBotServiceAccessor<BumpReminderManager>("BumpReminderManager");
export const getBotBumpReminderManager: () => BumpReminderManager =
  _bumpReminderManagerAccessor[0];
export const setBotBumpReminderManager: (value: BumpReminderManager) => void =
  _bumpReminderManagerAccessor[1];

const _vacSettingsServiceAccessor =
  createBotServiceAccessor<VacSettingsService>("VacSettingsService");
export const getBotVacSettingsService: () => VacSettingsService =
  _vacSettingsServiceAccessor[0];
export const setBotVacSettingsService: (value: VacSettingsService) => void =
  _vacSettingsServiceAccessor[1];

const _vacServiceAccessor = createBotServiceAccessor<VacService>("VacService");
export const getBotVacService: () => VacService = _vacServiceAccessor[0];
export const setBotVacService: (value: VacService) => void =
  _vacServiceAccessor[1];

const _stickyMessageSettingsServiceAccessor =
  createBotServiceAccessor<StickyMessageSettingsService>(
    "StickyMessageSettingsService",
  );
export const getBotStickyMessageSettingsService: () => StickyMessageSettingsService =
  _stickyMessageSettingsServiceAccessor[0];
export const setBotStickyMessageSettingsService: (
  value: StickyMessageSettingsService,
) => void = _stickyMessageSettingsServiceAccessor[1];

const _stickyMessageResendServiceAccessor =
  createBotServiceAccessor<StickyMessageResendService>(
    "StickyMessageResendService",
  );
export const getBotStickyMessageResendService: () => StickyMessageResendService =
  _stickyMessageResendServiceAccessor[0];
export const setBotStickyMessageResendService: (
  value: StickyMessageResendService,
) => void = _stickyMessageResendServiceAccessor[1];

const _memberLogSettingsServiceAccessor =
  createBotServiceAccessor<MemberLogSettingsService>(
    "MemberLogSettingsService",
  );
export const getBotMemberLogSettingsService: () => MemberLogSettingsService =
  _memberLogSettingsServiceAccessor[0];
export const setBotMemberLogSettingsService: (
  value: MemberLogSettingsService,
) => void = _memberLogSettingsServiceAccessor[1];

const _reactionRolePanelSettingsServiceAccessor =
  createBotServiceAccessor<ReactionRolePanelSettingsService>(
    "ReactionRolePanelSettingsService",
  );
export const getBotReactionRolePanelSettingsService: () => ReactionRolePanelSettingsService =
  _reactionRolePanelSettingsServiceAccessor[0];
export const setBotReactionRolePanelSettingsService: (
  value: ReactionRolePanelSettingsService,
) => void = _reactionRolePanelSettingsServiceAccessor[1];

const _ticketSettingsServiceAccessor =
  createBotServiceAccessor<TicketSettingsService>("TicketSettingsService");
export const getBotTicketSettingsService: () => TicketSettingsService =
  _ticketSettingsServiceAccessor[0];
export const setBotTicketSettingsService: (
  value: TicketSettingsService,
) => void = _ticketSettingsServiceAccessor[1];

const _ticketRepositoryAccessor =
  createBotServiceAccessor<ITicketRepository>("TicketRepository");
export const getBotTicketRepository: () => ITicketRepository =
  _ticketRepositoryAccessor[0];
export const setBotTicketRepository: (value: ITicketRepository) => void =
  _ticketRepositoryAccessor[1];

const _vcRecruitRepositoryAccessor =
  createBotServiceAccessor<IVcRecruitRepository>("VcRecruitRepository");
export const getBotVcRecruitRepository: () => IVcRecruitRepository =
  _vcRecruitRepositoryAccessor[0];
export const setBotVcRecruitRepository: (value: IVcRecruitRepository) => void =
  _vcRecruitRepositoryAccessor[1];

/** getBotVcRecruitRepository のエイリアス（config 操作用途で意図を明示する） */
export const getBotVcRecruitSettingsService: () => IVcRecruitRepository =
  _vcRecruitRepositoryAccessor[0];

// ---------------------------------------------------------------------------
// Composition Root initializer
// ---------------------------------------------------------------------------

/**
 * Botで利用する主要依存を起動時に初期化する
 */
export function initializeBotCompositionRoot(
  prisma: PrismaClient,
): BotServices {
  // スタンドアロンリポジトリ群
  const guildCoreRepo = getGuildCoreRepository(prisma);
  const afkRepo = getAfkSettingsRepository(prisma);
  const bumpReminderSettingsRepo = getBumpReminderSettingsRepository(prisma);
  const vacRepo = getVacSettingsRepository(prisma);
  const memberLogRepo = getMemberLogSettingsRepository(prisma);
  const vcRecruitSettingsRepo = getVcRecruitSettingsRepository(prisma);
  const stickyMessageRepository = getStickyMessageRepository(prisma);
  const reactionRolePanelRepository = getReactionRolePanelRepository(prisma);
  const ticketSettingsRepository = getTicketSettingsRepository(prisma);
  const ticketRepository = getTicketRepository(prisma);

  // 一括操作リポジトリ（各スタンドアロンリポジトリを集約）
  const aggregateRepo = new GuildSettingsAggregateRepository(
    guildCoreRepo,
    afkRepo,
    bumpReminderSettingsRepo,
    vacRepo,
    memberLogRepo,
    vcRecruitSettingsRepo,
    stickyMessageRepository,
    reactionRolePanelRepository,
    ticketSettingsRepository,
    ticketRepository,
    prisma,
  );

  // LocaleManager にコアリポジトリを設定
  localeManager.setRepository(guildCoreRepo);

  // GuildSettings
  const guildSettingsService = createGuildSettingsService(
    guildCoreRepo,
    aggregateRepo,
  );
  setBotGuildSettingsService(guildSettingsService);

  // BumpReminder
  const bumpReminderSettingsService = createBumpReminderFeatureSettingsService(
    bumpReminderSettingsRepo,
  );
  const bumpReminderRepository = getBumpReminderRepository(prisma);
  const bumpReminderManager = getBumpReminderManager(bumpReminderRepository);
  setBotBumpReminderSettingsService(bumpReminderSettingsService);
  setBotBumpReminderRepository(bumpReminderRepository);
  setBotBumpReminderManager(bumpReminderManager);

  // VAC
  const vacSettingsService = createVacSettingsService(vacRepo);
  const vacService = getVacService(vacSettingsService);
  setBotVacSettingsService(vacSettingsService);
  setBotVacService(vacService);

  // StickyMessage
  const stickyMessageSettingsService = createStickyMessageSettingsService(
    stickyMessageRepository,
  );
  const stickyMessageResendService = getStickyMessageResendService(
    stickyMessageRepository,
  );
  setBotStickyMessageSettingsService(stickyMessageSettingsService);
  setBotStickyMessageResendService(stickyMessageResendService);

  // MemberLog
  const memberLogSettingsService =
    createMemberLogSettingsService(memberLogRepo);
  setBotMemberLogSettingsService(memberLogSettingsService);

  // Ticket
  const ticketSettingsService = createTicketSettingsService(
    ticketSettingsRepository,
  );
  setBotTicketSettingsService(ticketSettingsService);
  setBotTicketRepository(ticketRepository);

  // ReactionRole
  const reactionRolePanelSettingsService =
    createReactionRolePanelSettingsService(reactionRolePanelRepository);
  setBotReactionRolePanelSettingsService(reactionRolePanelSettingsService);

  // VcRecruit
  const vcRecruitSettingsService = createVcRecruitSettingsService(
    vcRecruitSettingsRepo,
  );
  const vcRecruitRepository = createVcRecruitRepository(
    vcRecruitSettingsService,
  );
  setBotVcRecruitRepository(vcRecruitRepository);

  // VC操作パネルの所有権チェッカーを登録（VAC・VC募集）
  registerVcPanelOwnershipChecker({
    isManagedVcPanelChannel: (guildId, channelId) =>
      getBotVacSettingsService().isManagedVacChannel(guildId, channelId),
  });
  registerVcPanelOwnershipChecker({
    isManagedVcPanelChannel: (guildId, channelId) =>
      getBotVcRecruitRepository().isCreatedVcRecruitChannel(guildId, channelId),
  });

  return {
    guildSettingsService,
    bumpReminderSettingsService,
    bumpReminderRepository,
    bumpReminderManager,
    vacSettingsService,
    vacService,
    stickyMessageSettingsService,
    stickyMessageResendService,
    memberLogSettingsService,
    ticketSettingsService,
    ticketRepository,
    reactionRolePanelSettingsService,
    vcRecruitRepository,
  };
}
