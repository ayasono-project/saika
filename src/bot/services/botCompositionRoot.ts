// src/bot/services/botCompositionRoot.ts
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
import { GuildSettingsAggregateRepository } from "../../features/guild-settings/guildSettingsAggregateRepository";
import type { GuildSettingsService } from "../../features/guild-settings/guildSettingsService";
import { createGuildSettingsService } from "../../features/guild-settings/guildSettingsService";
import { getInactiveKickSettingsRepository } from "../../features/inactive-kick/inactiveKickSettingsRepository";
import type { InactiveKickSettingsService } from "../../features/inactive-kick/inactiveKickSettingsService";
import { createInactiveKickSettingsService } from "../../features/inactive-kick/inactiveKickSettingsService";
import { getMemberActivityRepository } from "../../features/inactive-kick/memberActivityRepository";
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
import type { VacService } from "../../features/vac/services/vacService";
import { getVacService } from "../../features/vac/services/vacService";
import { getVacSettingsRepository } from "../../features/vac/vacSettingsRepository";
import type { VacSettingsService } from "../../features/vac/vacSettingsService";
import { createVacSettingsService } from "../../features/vac/vacSettingsService";
import type { IVcRecruitRepository } from "../../features/vc-recruit/repositories/vcRecruitRepository";
import { createVcRecruitRepository } from "../../features/vc-recruit/repositories/vcRecruitRepository";
import { getVcRecruitSettingsRepository } from "../../features/vc-recruit/vcRecruitSettingsRepository";
import { createVcRecruitSettingsService } from "../../features/vc-recruit/vcRecruitSettingsService";
import type {
  IMemberActivityRepository,
  ITicketRepository,
} from "../../shared/database/types";
import { localeManager } from "../../shared/locale/localeManager";
import { createBotServiceAccessor } from "../../shared/utils/serviceFactory";

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
  inactiveKickSettingsService: InactiveKickSettingsService;
  unverifiedKickSettingsService: UnverifiedKickSettingsService;
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

const _inactiveKickSettingsServiceAccessor =
  createBotServiceAccessor<InactiveKickSettingsService>(
    "InactiveKickSettingsService",
  );
export const getBotInactiveKickSettingsService: () => InactiveKickSettingsService =
  _inactiveKickSettingsServiceAccessor[0];
export const setBotInactiveKickSettingsService: (
  value: InactiveKickSettingsService,
) => void = _inactiveKickSettingsServiceAccessor[1];

const _memberActivityRepositoryAccessor =
  createBotServiceAccessor<IMemberActivityRepository>(
    "MemberActivityRepository",
  );
export const getBotMemberActivityRepository: () => IMemberActivityRepository =
  _memberActivityRepositoryAccessor[0];
export const setBotMemberActivityRepository: (
  value: IMemberActivityRepository,
) => void = _memberActivityRepositoryAccessor[1];

const _unverifiedKickSettingsServiceAccessor =
  createBotServiceAccessor<UnverifiedKickSettingsService>(
    "UnverifiedKickSettingsService",
  );
export const getBotUnverifiedKickSettingsService: () => UnverifiedKickSettingsService =
  _unverifiedKickSettingsServiceAccessor[0];
export const setBotUnverifiedKickSettingsService: (
  value: UnverifiedKickSettingsService,
) => void = _unverifiedKickSettingsServiceAccessor[1];

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
  const inactiveKickRepo = getInactiveKickSettingsRepository(prisma);
  const memberActivityRepo = getMemberActivityRepository(prisma);
  const unverifiedKickRepo = getUnverifiedKickSettingsRepository(prisma);
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

  // InactiveKick（非アクティブ自動キック）
  const inactiveKickSettingsService =
    createInactiveKickSettingsService(inactiveKickRepo);
  setBotInactiveKickSettingsService(inactiveKickSettingsService);
  setBotMemberActivityRepository(memberActivityRepo);

  // UnverifiedKick（未承認ユーザー自動キック）
  const unverifiedKickSettingsService =
    createUnverifiedKickSettingsService(unverifiedKickRepo);
  setBotUnverifiedKickSettingsService(unverifiedKickSettingsService);

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
    inactiveKickSettingsService,
    unverifiedKickSettingsService,
    ticketSettingsService,
    ticketRepository,
    reactionRolePanelSettingsService,
    vcRecruitRepository,
  };
}
