// Bot層の依存解決を集約する Composition Root

import type { PrismaClient } from "@prisma/client";
import { getAfkSettingsRepository } from "../../features/afk/afkSettingsRepository";
import { getBumpReminderSettingsRepository } from "../../features/bump-reminder/bumpReminderSettingsRepository";
import type { BumpReminderSettingsService } from "../../features/bump-reminder/bumpReminderSettingsService";
import { getBumpReminderRepository } from "../../features/bump-reminder/repositories/bumpReminderRepository";
import type { IBumpReminderRepository as BumpReminderRepositoryType } from "../../features/bump-reminder/repositories/types";
import type { BumpReminderManager } from "../../features/bump-reminder/services/bumpReminderService";
import { getBumpReminderManager } from "../../features/bump-reminder/services/bumpReminderService";
import { createBumpReminderFeatureSettingsService } from "../../features/bump-reminder/services/bumpReminderSettingsServiceResolver";
import { getGuildCoreRepository } from "../../features/guild-settings/guildCoreRepository";
import { getGuildRegistryRepository } from "../../features/guild-settings/guildRegistryRepository";
import { GuildSettingsAggregateRepository } from "../../features/guild-settings/guildSettingsAggregateRepository";
import type { GuildSettingsService } from "../../features/guild-settings/guildSettingsService";
import { createGuildSettingsService } from "../../features/guild-settings/guildSettingsService";
import { getMemberLogSettingsRepository } from "../../features/member-log/memberLogSettingsRepository";
import type { MemberLogSettingsService } from "../../features/member-log/memberLogSettingsService";
import { createMemberLogSettingsService } from "../../features/member-log/memberLogSettingsService";
import { getReactionRolePanelRepository } from "../../features/reaction-role/reactionRolePanelRepository";
import type { ReactionRolePanelSettingsService } from "../../features/reaction-role/reactionRolePanelSettingsService";
import { createReactionRolePanelSettingsService } from "../../features/reaction-role/reactionRolePanelSettingsService";
import { getStickyMessageRepository } from "../../features/sticky-message/repositories/stickyMessageRepository";
import type { StickyMessageResendService } from "../../features/sticky-message/services/stickyMessageResendService";
import { getStickyMessageResendService } from "../../features/sticky-message/services/stickyMessageResendService";
import type { StickyMessageSettingsService } from "../../features/sticky-message/stickyMessageSettingsService";
import { createStickyMessageSettingsService } from "../../features/sticky-message/stickyMessageSettingsService";
import { getTicketRepository } from "../../features/ticket/repositories/ticketRepository";
import { getTicketSettingsRepository } from "../../features/ticket/ticketSettingsRepository";
import type { TicketSettingsService } from "../../features/ticket/ticketSettingsService";
import { createTicketSettingsService } from "../../features/ticket/ticketSettingsService";
import { getUnverifiedKickSettingsRepository } from "../../features/unverified-kick/unverifiedKickSettingsRepository";
import type { UnverifiedKickSettingsService } from "../../features/unverified-kick/unverifiedKickSettingsService";
import { createUnverifiedKickSettingsService } from "../../features/unverified-kick/unverifiedKickSettingsService";
import { getUnverifiedKickWarnRepository } from "../../features/unverified-kick/unverifiedKickWarnRepository";
import type { VacService } from "../../features/vac/services/vacService";
import { getVacService } from "../../features/vac/services/vacService";
import { getVacSettingsRepository } from "../../features/vac/vacSettingsRepository";
import type { VacSettingsService } from "../../features/vac/vacSettingsService";
import { createVacSettingsService } from "../../features/vac/vacSettingsService";
import type { VcAutoRecruitService } from "../../features/vc-auto-recruit/services/vcAutoRecruitService";
import { getVcAutoRecruitService } from "../../features/vc-auto-recruit/services/vcAutoRecruitService";
import { getVcAutoRecruitSettingsRepository } from "../../features/vc-auto-recruit/vcAutoRecruitSettingsRepository";
import type { VcAutoRecruitSettingsService } from "../../features/vc-auto-recruit/vcAutoRecruitSettingsService";
import { createVcAutoRecruitSettingsService } from "../../features/vc-auto-recruit/vcAutoRecruitSettingsService";
import type {
  IGuildRegistryRepository,
  ITicketRepository,
  IUnverifiedKickWarnRepository,
} from "../../shared/database/types";
import { localeManager } from "../../shared/locale/localeManager";
import { createBotServiceAccessor } from "../../shared/utils/serviceFactory";

// ---------------------------------------------------------------------------
// BotServices interface
// ---------------------------------------------------------------------------

export interface BotServices {
  guildSettingsService: GuildSettingsService;
  guildRegistryRepository: IGuildRegistryRepository;
  bumpReminderSettingsService: BumpReminderSettingsService;
  bumpReminderRepository: BumpReminderRepositoryType;
  bumpReminderManager: BumpReminderManager;
  vacSettingsService: VacSettingsService;
  vacService: VacService;
  vcAutoRecruitSettingsService: VcAutoRecruitSettingsService;
  vcAutoRecruitService: VcAutoRecruitService;
  stickyMessageSettingsService: StickyMessageSettingsService;
  stickyMessageResendService: StickyMessageResendService;
  memberLogSettingsService: MemberLogSettingsService;
  unverifiedKickSettingsService: UnverifiedKickSettingsService;
  ticketSettingsService: TicketSettingsService;
  ticketRepository: ITicketRepository;
  reactionRolePanelSettingsService: ReactionRolePanelSettingsService;
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

const _guildRegistryRepositoryAccessor =
  createBotServiceAccessor<IGuildRegistryRepository>("GuildRegistryRepository");
export const getBotGuildRegistryRepository: () => IGuildRegistryRepository =
  _guildRegistryRepositoryAccessor[0];
export const setBotGuildRegistryRepository: (
  value: IGuildRegistryRepository,
) => void = _guildRegistryRepositoryAccessor[1];

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

const _vcAutoRecruitSettingsServiceAccessor =
  createBotServiceAccessor<VcAutoRecruitSettingsService>(
    "VcAutoRecruitSettingsService",
  );
export const getBotVcAutoRecruitSettingsService: () => VcAutoRecruitSettingsService =
  _vcAutoRecruitSettingsServiceAccessor[0];
export const setBotVcAutoRecruitSettingsService: (
  value: VcAutoRecruitSettingsService,
) => void = _vcAutoRecruitSettingsServiceAccessor[1];

const _vcAutoRecruitServiceAccessor =
  createBotServiceAccessor<VcAutoRecruitService>("VcAutoRecruitService");
export const getBotVcAutoRecruitService: () => VcAutoRecruitService =
  _vcAutoRecruitServiceAccessor[0];
export const setBotVcAutoRecruitService: (value: VcAutoRecruitService) => void =
  _vcAutoRecruitServiceAccessor[1];

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

const _unverifiedKickSettingsServiceAccessor =
  createBotServiceAccessor<UnverifiedKickSettingsService>(
    "UnverifiedKickSettingsService",
  );
export const getBotUnverifiedKickSettingsService: () => UnverifiedKickSettingsService =
  _unverifiedKickSettingsServiceAccessor[0];
export const setBotUnverifiedKickSettingsService: (
  value: UnverifiedKickSettingsService,
) => void = _unverifiedKickSettingsServiceAccessor[1];

const _unverifiedKickWarnRepositoryAccessor =
  createBotServiceAccessor<IUnverifiedKickWarnRepository>(
    "UnverifiedKickWarnRepository",
  );
export const getBotUnverifiedKickWarnRepository: () => IUnverifiedKickWarnRepository =
  _unverifiedKickWarnRepositoryAccessor[0];
export const setBotUnverifiedKickWarnRepository: (
  value: IUnverifiedKickWarnRepository,
) => void = _unverifiedKickWarnRepositoryAccessor[1];

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
  const guildRegistryRepo = getGuildRegistryRepository(prisma);
  const afkRepo = getAfkSettingsRepository(prisma);
  const bumpReminderSettingsRepo = getBumpReminderSettingsRepository(prisma);
  const vacRepo = getVacSettingsRepository(prisma);
  const vcAutoRecruitRepo = getVcAutoRecruitSettingsRepository(prisma);
  const memberLogRepo = getMemberLogSettingsRepository(prisma);
  const unverifiedKickRepo = getUnverifiedKickSettingsRepository(prisma);
  const unverifiedKickWarnRepo = getUnverifiedKickWarnRepository(prisma);
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
    vcAutoRecruitRepo,
    unverifiedKickRepo,
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
  setBotGuildRegistryRepository(guildRegistryRepo);

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

  // VcAutoRecruit（VC自動募集）
  const vcAutoRecruitSettingsService =
    createVcAutoRecruitSettingsService(vcAutoRecruitRepo);
  const vcAutoRecruitService = getVcAutoRecruitService(
    vcAutoRecruitSettingsService,
    vacSettingsService,
  );
  setBotVcAutoRecruitSettingsService(vcAutoRecruitSettingsService);
  setBotVcAutoRecruitService(vcAutoRecruitService);

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

  // UnverifiedKick（未承認ユーザー自動キック）
  const unverifiedKickSettingsService =
    createUnverifiedKickSettingsService(unverifiedKickRepo);
  setBotUnverifiedKickSettingsService(unverifiedKickSettingsService);
  setBotUnverifiedKickWarnRepository(unverifiedKickWarnRepo);

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

  return {
    guildSettingsService,
    guildRegistryRepository: guildRegistryRepo,
    bumpReminderSettingsService,
    bumpReminderRepository,
    bumpReminderManager,
    vacSettingsService,
    vacService,
    vcAutoRecruitSettingsService,
    vcAutoRecruitService,
    stickyMessageSettingsService,
    stickyMessageResendService,
    memberLogSettingsService,
    unverifiedKickSettingsService,
    ticketSettingsService,
    ticketRepository,
    reactionRolePanelSettingsService,
  };
}
