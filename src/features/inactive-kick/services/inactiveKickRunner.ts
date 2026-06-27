// src/features/inactive-kick/services/inactiveKickRunner.ts
// 非アクティブ自動キックの時間単位スイープ（候補抽出 → 段階通知 → キック実行）

import {
  ChannelType,
  type Guild,
  type GuildMember,
  PermissionFlagsBits,
  type SendableChannels,
} from "discord.js";
import cron from "node-cron";
import type { BotClient } from "../../../bot/client";
import {
  getBotInactiveKickSettingsService,
  getBotMemberActivityRepository,
} from "../../../bot/services/botCompositionRoot";
import { sendNotification } from "../../../bot/shared/notificationSender";
import { env } from "../../../shared/config/env";
import type { InactiveKickSettings } from "../../../shared/database/types";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  INACTIVE_KICK_THRESHOLD_MAX_DAYS,
  INACTIVE_KICK_THRESHOLD_MIN_DAYS,
} from "../inactiveKickSettingsDefaults";
import {
  type CandidateActivity,
  type CandidateBuckets,
  type CandidateMemberInput,
  type CategorizedCandidate,
  categorizeCandidates,
} from "./inactiveKickCandidates";
import { WARN_STAGE } from "./inactiveKickEligibility";
import {
  buildKickNotification,
  buildWarnNotification,
} from "./inactiveKickNotifier";
import {
  buildObsoleteInactiveKickNotice,
  detectObsoleteInactiveKickPlaceholders,
} from "./inactiveKickObsoletePlaceholders";

/** 日次チェックジョブの固定 ID */
export const INACTIVE_KICK_JOB_ID = "inactive-kick:daily-check";
/** スイープの cron 式（毎時 0 分）。per-guild の timezone/runHour でフィルタリングする */
export const INACTIVE_KICK_JOB_SCHEDULE = "0 * * * *";

const LOG_PREFIX = "system:log_prefix.inactive_kick";

/**
 * スイープの cron 式を解決する。
 * `INACTIVE_KICK_CRON`（dev/検証用の上書き）が有効な cron 式なら優先し、
 * 未設定・不正なら毎時スイープを使う。
 */
export function resolveInactiveKickSchedule(): string {
  const override = env.INACTIVE_KICK_CRON_OVERRIDE;
  if (!override) return INACTIVE_KICK_JOB_SCHEDULE;
  if (cron.validate(override)) {
    logger.warn(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.cron_override", {
        schedule: override,
      }),
    );
    return override;
  }
  logger.warn(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.cron_invalid", {
      schedule: INACTIVE_KICK_JOB_SCHEDULE,
    }),
  );
  return INACTIVE_KICK_JOB_SCHEDULE;
}

/** `date` をそのタイムゾーンで表したときの時（0〜23）を返す */
function getHourInTimezone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
}

/** `date` をそのタイムゾーンで表したときの日付文字列（"YYYY-MM-DD"）を返す */
function getLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

/**
 * GuildMember を区分用の正規化形へ変換する。
 */
function toCandidateInput(
  member: GuildMember,
  guild: Guild,
  markerRoleId: string | undefined,
): CandidateMemberInput {
  return {
    userId: member.id,
    displayName: member.displayName,
    isBot: member.user.bot,
    isOwner: member.id === guild.ownerId,
    isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
    inVoice: member.voice.channelId != null,
    memberRoleIds: [...member.roles.cache.keys()],
    joinedAt: member.joinedAt,
    hasMarkerRole: markerRoleId ? member.roles.cache.has(markerRoleId) : false,
  };
}

/**
 * ギルドメンバーと活動履歴から候補区分を算出する（日次チェックと preview で共有）。
 */
export async function buildCandidateBuckets(
  guild: Guild,
  members: GuildMember[],
  settings: InactiveKickSettings,
  now: Date,
): Promise<CandidateBuckets> {
  const activityList = await getBotMemberActivityRepository().findByGuild(
    guild.id,
  );
  const activities = new Map<string, CandidateActivity>(
    activityList.map((a) => [
      a.userId,
      { lastActivityAt: a.lastActivityAt, warnStage: a.warnStage },
    ]),
  );
  const normalized = members.map((m) =>
    toCandidateInput(m, guild, settings.markerRoleId),
  );
  return categorizeCandidates(normalized, activities, settings, now);
}

/**
 * 除外メンバーの猶予クリア（warnStage を 0 にリセット）を行う。
 */
async function applyGraceClear(
  guild: Guild,
  buckets: CandidateBuckets,
): Promise<void> {
  const activityRepo = getBotMemberActivityRepository();
  for (const target of buckets.graceClear) {
    try {
      await activityRepo.setWarnStage(guild.id, target.userId, WARN_STAGE.NONE);
    } catch (err) {
      logger.warn(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.marker_role_remove_failed", {
          guildId: guild.id,
          userId: target.userId,
        }),
        err,
      );
    }
  }
}

/**
 * 対象ロールの整合チェック（shouldHaveMarker セットと実際の付与状態を一致させる）。
 * - 週通知・最終警告・キック対象 → 付与すべき
 * - それ以外で付与中 → 剥奪する
 */
async function applyMarkerRoleConsistency(
  guild: Guild,
  members: GuildMember[],
  buckets: CandidateBuckets,
  markerRoleId: string,
): Promise<void> {
  const t = await getGuildTranslator(guild.id);
  const shouldHave = new Set([
    ...buckets.weekWarn.map((c) => c.userId),
    ...buckets.finalWarn.map((c) => c.userId),
    ...buckets.kick.map((c) => c.userId),
  ]);

  for (const member of members) {
    if (member.user.bot) continue;
    const has = member.roles.cache.has(markerRoleId);
    const needs = shouldHave.has(member.id);

    if (has && !needs) {
      await member.roles
        .remove(markerRoleId, t("inactiveKick:audit_reason.reactivated"))
        .catch((err) =>
          logger.warn(
            logPrefixed(
              LOG_PREFIX,
              "inactiveKick:log.marker_role_remove_failed",
              { guildId: guild.id, userId: member.id },
            ),
            err,
          ),
        );
    } else if (!has && needs) {
      await member.roles
        .add(markerRoleId, t("inactiveKick:audit_reason.marker_assigned"))
        .catch((err) =>
          logger.warn(
            logPrefixed(
              LOG_PREFIX,
              "inactiveKick:log.marker_role_assign_failed",
              { guildId: guild.id, userId: member.id },
            ),
            err,
          ),
        );
    }
  }
}

/**
 * 段階通知を送信し、成功時のみ対象メンバーの warnStage を前進させる。
 */
async function sendStageNotification(
  guild: Guild,
  channel: SendableChannels,
  candidates: CategorizedCandidate[],
  nextWarnStage: number,
  settings: InactiveKickSettings,
  now: Date,
): Promise<void> {
  if (candidates.length === 0) return;

  const isFinal = nextWarnStage === WARN_STAGE.FINAL;
  const t = await getGuildTranslator(guild.id);
  const { content, embeds } = buildWarnNotification(candidates, {
    t,
    serverName: guild.name,
    thresholdDays: settings.thresholdDays,
    now,
    timezone: settings.timezone,
    runHour: settings.runHour,
    mentionEnabled: settings.mentionEnabled,
    customMessage: isFinal
      ? settings.finalWarnMessage
      : settings.weekWarnMessage,
    defaultMessageKey: isFinal
      ? "inactiveKick:default.final_warn_message"
      : "inactiveKick:default.week_warn_message",
  });

  let firstMessageSent = false;
  try {
    const result = await sendNotification((payload) => channel.send(payload), {
      content,
      embeds,
    });
    firstMessageSent = result.firstMessageSent;
  } catch (err) {
    logger.error(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.notification_failed", {
        guildId: guild.id,
        stage: String(nextWarnStage),
      }),
      err,
    );
    return;
  }

  if (!firstMessageSent) return;

  // 送信成功 → warnStage を永続化
  const activityRepo = getBotMemberActivityRepository();
  for (const candidate of candidates) {
    await activityRepo
      .setWarnStage(guild.id, candidate.userId, nextWarnStage)
      .catch(() => {});
  }
}

/**
 * 廃止プレースホルダーが検出されたときに案内 Embed を通知チャンネルへ送信する。
 */
async function sendObsoleteInactiveKickNotice(
  guild: Guild,
  channel: SendableChannels,
  settings: {
    weekWarnMessage?: string | null;
    finalWarnMessage?: string | null;
    kickMessage?: string | null;
  },
): Promise<void> {
  const detected = detectObsoleteInactiveKickPlaceholders(settings);
  if (!detected.hasDaysLeft && !detected.hasMarkerRole) return;
  const t = await getGuildTranslator(guild.id);
  const notice = buildObsoleteInactiveKickNotice(t, detected);
  if (notice) {
    await channel.send({ embeds: [notice] }).catch((err) => {
      logger.warn(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.notification_failed", {
          guildId: guild.id,
          stage: "obsolete_notice",
        }),
        err,
      );
    });
  }
}

/**
 * キック対象を処理し、キック通知を送信する。
 */
async function processKicks(
  guild: Guild,
  channel: SendableChannels,
  candidates: CategorizedCandidate[],
  settings: InactiveKickSettings,
): Promise<void> {
  if (candidates.length === 0) return;

  const testMode = env.INACTIVE_KICK_DRY_RUN;
  const t = await getGuildTranslator(guild.id);
  const activityRepo = getBotMemberActivityRepository();
  const kicked: { displayName: string; userId: string }[] = [];

  for (const candidate of candidates) {
    const { displayName, userId } = candidate;

    if (testMode) {
      kicked.push({ displayName, userId });
      continue;
    }

    const member = await guild.members
      .fetch(candidate.userId)
      .catch(() => null);
    if (!member) continue;

    if (!member.kickable) {
      logger.warn(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.kick_skipped_unkickable", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
      );
      continue;
    }

    try {
      await member.kick(t("inactiveKick:audit_reason.kick"));
      kicked.push({ displayName, userId });
      await activityRepo
        .deleteActivity(guild.id, candidate.userId)
        .catch(() => {});
      logger.info(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.kicked", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
      );
    } catch (err) {
      logger.error(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.kick_failed", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
        err,
      );
    }
  }

  if (kicked.length === 0) return;

  const { content, embeds } = buildKickNotification(kicked, {
    t,
    serverName: guild.name,
    thresholdDays: settings.thresholdDays,
    customMessage: settings.kickMessage,
    testMode,
  });
  await sendNotification((payload) => channel.send(payload), {
    content,
    embeds,
  }).catch((err) => {
    logger.error(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.notification_failed", {
        guildId: guild.id,
        stage: "kick",
      }),
      err,
    );
  });
}

/**
 * `INACTIVE_KICK_MOCK_MEMBERS` 用のモックバケットを生成する。
 * thresholdDays を基準に週次警告・最終警告・キックを count 件に分配する。
 */
function buildMockInactiveKickBuckets(
  count: number,
  settings: InactiveKickSettings,
): CandidateBuckets {
  const threshold = settings.thresholdDays;

  const make = (
    i: number,
    stage: number,
    inactiveDays: number,
    daysLeft: number,
  ): CategorizedCandidate => ({
    userId: `mock-ik-${["week", "final", "kick"][stage]}-${i}`,
    displayName: `テスト${["週次警告", "最終警告", "キック"][stage]}${i + 1}`,
    inactiveDays,
    daysLeft,
    warnStage: stage,
    isMarkerTarget: stage > 0,
    hasMarkerRole: stage > 0,
  });

  return {
    graceClear: [],
    weekWarn: Array.from({ length: count }, (_, i) =>
      make(i, 0, threshold - 7, 7),
    ),
    finalWarn: Array.from({ length: count }, (_, i) =>
      make(i, 1, threshold - 1, 1),
    ),
    kick: Array.from({ length: count }, (_, i) => make(i, 2, threshold + 1, 0)),
  };
}

/**
 * 1 ギルドのスイープ処理を行う。
 */
export async function processGuildInactiveKick(
  client: BotClient,
  settings: InactiveKickSettings & { guildId: string },
): Promise<void> {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return;

  const settingsService = getBotInactiveKickSettingsService();

  if (
    settings.thresholdDays < INACTIVE_KICK_THRESHOLD_MIN_DAYS ||
    settings.thresholdDays > INACTIVE_KICK_THRESHOLD_MAX_DAYS
  ) {
    await settingsService.disableInvalid(guild.id);
    logger.warn(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.guild_disabled_invalid", {
        guildId: guild.id,
        reason: "threshold_out_of_range",
      }),
    );
    return;
  }

  if (!settings.channelId) {
    await settingsService.disableInvalid(guild.id);
    logger.warn(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.guild_disabled_invalid", {
        guildId: guild.id,
        reason: "no_channel",
      }),
    );
    return;
  }
  const channel = await guild.channels
    .fetch(settings.channelId)
    .catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    await settingsService.disableInvalid(guild.id);
    logger.warn(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.guild_disabled_invalid", {
        guildId: guild.id,
        reason: "channel_missing",
      }),
    );
    return;
  }

  const now = new Date();

  // INACTIVE_KICK_MOCK_MEMBERS が設定されていればモックデータで通知のみ実行（DB/Guild fetch を省略）
  const mockCount = env.INACTIVE_KICK_MOCK_MEMBERS;
  if (mockCount != null && mockCount > 0) {
    const mockBuckets = buildMockInactiveKickBuckets(mockCount, settings);
    await sendStageNotification(
      guild,
      channel,
      mockBuckets.weekWarn,
      WARN_STAGE.WEEK,
      settings,
      now,
    );
    if (mockBuckets.weekWarn.length > 0) {
      await sendObsoleteInactiveKickNotice(guild, channel, {
        weekWarnMessage: settings.weekWarnMessage,
      });
    }
    await sendStageNotification(
      guild,
      channel,
      mockBuckets.finalWarn,
      WARN_STAGE.FINAL,
      settings,
      now,
    );
    if (mockBuckets.finalWarn.length > 0) {
      await sendObsoleteInactiveKickNotice(guild, channel, {
        finalWarnMessage: settings.finalWarnMessage,
      });
    }
    await processKicks(guild, channel, mockBuckets.kick, settings);
    if (mockBuckets.kick.length > 0) {
      await sendObsoleteInactiveKickNotice(guild, channel, {
        kickMessage: settings.kickMessage,
      });
    }
    return;
  }

  let members: GuildMember[];
  try {
    members = [...(await guild.members.fetch()).values()];
  } catch (err) {
    logger.error(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.members_fetch_failed", {
        guildId: guild.id,
      }),
      err,
    );
    return;
  }

  const buckets = await buildCandidateBuckets(guild, members, settings, now);

  // 1. 除外メンバーの猶予クリア（warnStage リセット）
  await applyGraceClear(guild, buckets);

  // 2. 対象ロール整合チェック（excess 剥奪 + missing 付与）
  if (settings.markerRoleId) {
    await applyMarkerRoleConsistency(
      guild,
      members,
      buckets,
      settings.markerRoleId,
    );
  }

  // 3. 段階通知（送信成功時のみ warnStage 前進）
  await sendStageNotification(
    guild,
    channel,
    buckets.weekWarn,
    WARN_STAGE.WEEK,
    settings,
    now,
  );
  if (buckets.weekWarn.length > 0) {
    await sendObsoleteInactiveKickNotice(guild, channel, {
      weekWarnMessage: settings.weekWarnMessage,
    });
  }
  await sendStageNotification(
    guild,
    channel,
    buckets.finalWarn,
    WARN_STAGE.FINAL,
    settings,
    now,
  );
  if (buckets.finalWarn.length > 0) {
    await sendObsoleteInactiveKickNotice(guild, channel, {
      finalWarnMessage: settings.finalWarnMessage,
    });
  }

  // 4. キック実行 + 通知
  await processKicks(guild, channel, buckets.kick, settings);
  if (buckets.kick.length > 0) {
    await sendObsoleteInactiveKickNotice(guild, channel, {
      kickMessage: settings.kickMessage,
    });
  }
}

/**
 * 全ギルドのスイープを実行する。
 * per-guild の timezone/runHour フィルタと lastRunDate ガードを適用する。
 */
export async function runInactiveKickDailyCheck(
  client: BotClient,
): Promise<void> {
  logger.info(logPrefixed(LOG_PREFIX, "inactiveKick:log.daily_check_started"));

  const settingsList =
    await getBotInactiveKickSettingsService().getAllEnabled();
  const now = new Date();

  const skipGuards = env.INACTIVE_KICK_SKIP_GUARDS;
  let processed = 0;
  for (const settings of settingsList) {
    const timezone = settings.timezone;
    const currentHour = getHourInTimezone(now, timezone);
    if (!skipGuards && currentHour !== settings.runHour) continue;

    const todayStr = getLocalDateString(now, timezone);
    if (!skipGuards && settings.lastRunDate === todayStr) continue;

    try {
      await processGuildInactiveKick(client, settings);
      await getBotInactiveKickSettingsService()
        .updateLastRunDate(settings.guildId, todayStr)
        .catch(() => {});
      processed += 1;
    } catch (err) {
      logger.error(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.guild_check_failed", {
          guildId: settings.guildId,
        }),
        err,
      );
    }
  }

  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.daily_check_completed", {
      guildCount: processed,
    }),
  );
}
