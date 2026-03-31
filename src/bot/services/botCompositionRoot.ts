// src/bot/services/botCompositionRoot.ts
// Bot層の依存解決を集約する Composition Root

import type { PrismaClient } from "@prisma/client";
import { getAfkConfigRepository } from "../../shared/database/repositories/afkConfigRepository";
import { getBumpReminderConfigRepository } from "../../shared/database/repositories/bumpReminderConfigRepository";
import { GuildConfigAggregateRepository } from "../../shared/database/repositories/guildConfigAggregateRepository";
import { getGuildCoreRepository } from "../../shared/database/repositories/guildCoreRepository";
import { getMemberLogConfigRepository } from "../../shared/database/repositories/memberLogConfigRepository";
import { getReactionRolePanelRepository } from "../../shared/database/repositories/reactionRolePanelRepository";
import { getTicketConfigRepository } from "../../shared/database/repositories/ticketConfigRepository";
import { getVacConfigRepository } from "../../shared/database/repositories/vacConfigRepository";
import { getVcRecruitConfigRepository } from "../../shared/database/repositories/vcRecruitConfigRepository";
import type { ITicketRepository } from "../../shared/database/types";
import type { BumpReminderConfigService } from "../../shared/features/bump-reminder/bumpReminderConfigService";
import type { GuildConfigService } from "../../shared/features/guild-config/guildConfigService";
import { createGuildConfigService } from "../../shared/features/guild-config/guildConfigService";
import type { MemberLogConfigService } from "../../shared/features/member-log/memberLogConfigService";
import { createMemberLogConfigService } from "../../shared/features/member-log/memberLogConfigService";
import type { ReactionRolePanelConfigService } from "../../shared/features/reaction-role/reactionRolePanelConfigService";
import { createReactionRolePanelConfigService } from "../../shared/features/reaction-role/reactionRolePanelConfigService";
import type { StickyMessageConfigService } from "../../shared/features/sticky-message/stickyMessageConfigService";
import { createStickyMessageConfigService } from "../../shared/features/sticky-message/stickyMessageConfigService";
import type { TicketConfigService } from "../../shared/features/ticket/ticketConfigService";
import { createTicketConfigService } from "../../shared/features/ticket/ticketConfigService";
import type { VacConfigService } from "../../shared/features/vac/vacConfigService";
import { createVacConfigService } from "../../shared/features/vac/vacConfigService";
import { createVcRecruitConfigService } from "../../shared/features/vc-recruit/vcRecruitConfigService";
import { localeManager } from "../../shared/locale/localeManager";
import { createBotServiceAccessor } from "../../shared/utils/serviceFactory";
import { getBumpReminderRepository } from "../features/bump-reminder/repositories/bumpReminderRepository";
import type { IBumpReminderRepository as BumpReminderRepositoryType } from "../features/bump-reminder/repositories/types";
import { createBumpReminderFeatureConfigService } from "../features/bump-reminder/services/bumpReminderConfigServiceResolver";
import type { BumpReminderManager } from "../features/bump-reminder/services/bumpReminderService";
import { getBumpReminderManager } from "../features/bump-reminder/services/bumpReminderService";
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
  guildConfigService: GuildConfigService;
  bumpReminderConfigService: BumpReminderConfigService;
  bumpReminderRepository: BumpReminderRepositoryType;
  bumpReminderManager: BumpReminderManager;
  vacConfigService: VacConfigService;
  vacService: VacService;
  stickyMessageConfigService: StickyMessageConfigService;
  stickyMessageResendService: StickyMessageResendService;
  memberLogConfigService: MemberLogConfigService;
  ticketConfigService: TicketConfigService;
  ticketRepository: ITicketRepository;
  reactionRolePanelConfigService: ReactionRolePanelConfigService;
  vcRecruitRepository: IVcRecruitRepository;
}

// ---------------------------------------------------------------------------
// Module-level singletons
// ---------------------------------------------------------------------------

const _guildConfigServiceAccessor =
  createBotServiceAccessor<GuildConfigService>("GuildConfigService");
export const getBotGuildConfigService: () => GuildConfigService =
  _guildConfigServiceAccessor[0];
export const setBotGuildConfigService: (value: GuildConfigService) => void =
  _guildConfigServiceAccessor[1];

const _bumpReminderConfigServiceAccessor =
  createBotServiceAccessor<BumpReminderConfigService>(
    "BumpReminderConfigService",
  );
export const getBotBumpReminderConfigService: () => BumpReminderConfigService =
  _bumpReminderConfigServiceAccessor[0];
export const setBotBumpReminderConfigService: (
  value: BumpReminderConfigService,
) => void = _bumpReminderConfigServiceAccessor[1];

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

const _vacConfigServiceAccessor =
  createBotServiceAccessor<VacConfigService>("VacConfigService");
export const getBotVacConfigService: () => VacConfigService =
  _vacConfigServiceAccessor[0];
export const setBotVacConfigService: (value: VacConfigService) => void =
  _vacConfigServiceAccessor[1];

const _vacServiceAccessor = createBotServiceAccessor<VacService>("VacService");
export const getBotVacService: () => VacService = _vacServiceAccessor[0];
export const setBotVacService: (value: VacService) => void =
  _vacServiceAccessor[1];

const _stickyMessageConfigServiceAccessor =
  createBotServiceAccessor<StickyMessageConfigService>(
    "StickyMessageConfigService",
  );
export const getBotStickyMessageConfigService: () => StickyMessageConfigService =
  _stickyMessageConfigServiceAccessor[0];
export const setBotStickyMessageConfigService: (
  value: StickyMessageConfigService,
) => void = _stickyMessageConfigServiceAccessor[1];

const _stickyMessageResendServiceAccessor =
  createBotServiceAccessor<StickyMessageResendService>(
    "StickyMessageResendService",
  );
export const getBotStickyMessageResendService: () => StickyMessageResendService =
  _stickyMessageResendServiceAccessor[0];
export const setBotStickyMessageResendService: (
  value: StickyMessageResendService,
) => void = _stickyMessageResendServiceAccessor[1];

const _memberLogConfigServiceAccessor =
  createBotServiceAccessor<MemberLogConfigService>("MemberLogConfigService");
export const getBotMemberLogConfigService: () => MemberLogConfigService =
  _memberLogConfigServiceAccessor[0];
export const setBotMemberLogConfigService: (
  value: MemberLogConfigService,
) => void = _memberLogConfigServiceAccessor[1];

const _reactionRolePanelConfigServiceAccessor =
  createBotServiceAccessor<ReactionRolePanelConfigService>(
    "ReactionRolePanelConfigService",
  );
export const getBotReactionRolePanelConfigService: () => ReactionRolePanelConfigService =
  _reactionRolePanelConfigServiceAccessor[0];
export const setBotReactionRolePanelConfigService: (
  value: ReactionRolePanelConfigService,
) => void = _reactionRolePanelConfigServiceAccessor[1];

const _ticketConfigServiceAccessor =
  createBotServiceAccessor<TicketConfigService>("TicketConfigService");
export const getBotTicketConfigService: () => TicketConfigService =
  _ticketConfigServiceAccessor[0];
export const setBotTicketConfigService: (value: TicketConfigService) => void =
  _ticketConfigServiceAccessor[1];

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
export const getBotVcRecruitConfigService: () => IVcRecruitRepository =
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
  const afkRepo = getAfkConfigRepository(prisma);
  const bumpReminderConfigRepo = getBumpReminderConfigRepository(prisma);
  const vacRepo = getVacConfigRepository(prisma);
  const memberLogRepo = getMemberLogConfigRepository(prisma);
  const vcRecruitConfigRepo = getVcRecruitConfigRepository(prisma);

  // 一括操作リポジトリ（各スタンドアロンリポジトリを集約）
  const aggregateRepo = new GuildConfigAggregateRepository(
    guildCoreRepo,
    afkRepo,
    bumpReminderConfigRepo,
    vacRepo,
    memberLogRepo,
    vcRecruitConfigRepo,
    prisma,
  );

  // LocaleManager にコアリポジトリを設定
  localeManager.setRepository(guildCoreRepo);

  // GuildConfig
  const guildConfigService = createGuildConfigService(
    guildCoreRepo,
    aggregateRepo,
  );
  setBotGuildConfigService(guildConfigService);

  // BumpReminder
  const bumpReminderConfigService = createBumpReminderFeatureConfigService(
    bumpReminderConfigRepo,
  );
  const bumpReminderRepository = getBumpReminderRepository(prisma);
  const bumpReminderManager = getBumpReminderManager(bumpReminderRepository);
  setBotBumpReminderConfigService(bumpReminderConfigService);
  setBotBumpReminderRepository(bumpReminderRepository);
  setBotBumpReminderManager(bumpReminderManager);

  // VAC
  const vacConfigService = createVacConfigService(vacRepo);
  const vacService = getVacService(vacConfigService);
  setBotVacConfigService(vacConfigService);
  setBotVacService(vacService);

  // StickyMessage
  const stickyMessageRepository = getStickyMessageRepository(prisma);
  const stickyMessageConfigService = createStickyMessageConfigService(
    stickyMessageRepository,
  );
  const stickyMessageResendService = getStickyMessageResendService(
    stickyMessageRepository,
  );
  setBotStickyMessageConfigService(stickyMessageConfigService);
  setBotStickyMessageResendService(stickyMessageResendService);

  // MemberLog
  const memberLogConfigService = createMemberLogConfigService(memberLogRepo);
  setBotMemberLogConfigService(memberLogConfigService);

  // Ticket
  const ticketConfigRepository = getTicketConfigRepository(prisma);
  const ticketConfigService = createTicketConfigService(ticketConfigRepository);
  const ticketRepository = getTicketRepository(prisma);
  setBotTicketConfigService(ticketConfigService);
  setBotTicketRepository(ticketRepository);

  // ReactionRole
  const reactionRolePanelRepository = getReactionRolePanelRepository(prisma);
  const reactionRolePanelConfigService = createReactionRolePanelConfigService(
    reactionRolePanelRepository,
  );
  setBotReactionRolePanelConfigService(reactionRolePanelConfigService);

  // VcRecruit
  const vcRecruitConfigService =
    createVcRecruitConfigService(vcRecruitConfigRepo);
  const vcRecruitRepository = createVcRecruitRepository(vcRecruitConfigService);
  setBotVcRecruitRepository(vcRecruitRepository);

  // VC操作パネルの所有権チェッカーを登録（VAC・VC募集）
  registerVcPanelOwnershipChecker({
    isManagedVcPanelChannel: (guildId, channelId) =>
      getBotVacConfigService().isManagedVacChannel(guildId, channelId),
  });
  registerVcPanelOwnershipChecker({
    isManagedVcPanelChannel: (guildId, channelId) =>
      getBotVcRecruitRepository().isCreatedVcRecruitChannel(guildId, channelId),
  });

  return {
    guildConfigService,
    bumpReminderConfigService,
    bumpReminderRepository,
    bumpReminderManager,
    vacConfigService,
    vacService,
    stickyMessageConfigService,
    stickyMessageResendService,
    memberLogConfigService,
    ticketConfigService,
    ticketRepository,
    reactionRolePanelConfigService,
    vcRecruitRepository,
  };
}
