// src/features/inactive-kick/services/inactiveKickRunner.ts
// 非アクティブ自動キックの日次チェック本体（候補抽出 → 段階通知 → キック実行）

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
import { sendPaginatedEmbeds } from "../../../bot/shared/embedPaginator";
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

/** 日次チェックジョブの固定 ID */
export const INACTIVE_KICK_JOB_ID = "inactive-kick:daily-check";
/** 日次チェックの cron 式（毎日 04:00） */
export const INACTIVE_KICK_JOB_SCHEDULE = "0 4 * * *";
/** 日次チェックのタイムゾーン */
export const INACTIVE_KICK_JOB_TIMEZONE = "Asia/Tokyo";

/** 段階通知チャンネルのページネーター有効時間（1 時間） */
const NOTIFICATION_COLLECTOR_MS = 60 * 60 * 1000;
/** ページネーター customId プレフィックス */
const WARN_PAGINATOR_PREFIX = "inactive-kick:notify-warn";
const KICK_PAGINATOR_PREFIX = "inactive-kick:notify-kick";

const LOG_PREFIX = "system:log_prefix.inactive_kick";

/**
 * 日次チェックの cron 式を解決する。
 * `INACTIVE_KICK_CRON`（dev/検証用の上書き）が有効な cron 式なら優先し、
 * 未設定・不正なら既定（毎日 04:00）を用いる。
 * @returns 使用する cron 式
 */
export function resolveInactiveKickSchedule(): string {
  const override = env.INACTIVE_KICK_CRON;
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
 * @param guild 対象ギルド
 * @param members 取得済みのギルドメンバー一覧
 * @param settings 区分に用いる設定
 * @param now 現在時刻
 * @returns 区分結果
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
 * 除外メンバーの猶予クリア（warnStage を 0 にリセット・対象ロール剥奪）を行う。
 */
async function applyGraceClear(
  guild: Guild,
  buckets: CandidateBuckets,
  markerRoleId: string | undefined,
): Promise<void> {
  const activityRepo = getBotMemberActivityRepository();
  for (const target of buckets.graceClear) {
    try {
      await activityRepo.setWarnStage(guild.id, target.userId, WARN_STAGE.NONE);
      if (markerRoleId && target.hasMarkerRole) {
        const member = await guild.members
          .fetch(target.userId)
          .catch(() => null);
        await member?.roles
          .remove(markerRoleId)
          .catch((err) => logMarkerRemoveFailed(guild.id, target.userId, err));
      }
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

function logMarkerRemoveFailed(
  guildId: string,
  userId: string,
  err: unknown,
): void {
  logger.warn(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.marker_role_remove_failed", {
      guildId,
      userId,
    }),
    err,
  );
}

/**
 * 警告対象（週通知・最終警告）へ対象ロールを付与する（未付与のもののみ）。
 */
async function assignMarkerRoles(
  guild: Guild,
  warningCandidates: CategorizedCandidate[],
  markerRoleId: string,
): Promise<void> {
  for (const candidate of warningCandidates) {
    if (candidate.hasMarkerRole) continue;
    try {
      const member = await guild.members
        .fetch(candidate.userId)
        .catch(() => null);
      const t = await getGuildTranslator(guild.id);
      await member?.roles.add(
        markerRoleId,
        t("inactiveKick:audit_reason.marker_assigned"),
      );
    } catch (err) {
      logger.warn(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.marker_role_assign_failed", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
        err,
      );
    }
  }
}

/**
 * 段階通知を送信し、成功時のみ対象メンバーの warnStage を前進させる。
 * @returns 送信に成功したか
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
    // 段階ごとに別のカスタム文・デフォルト文を使う
    customMessage: isFinal
      ? settings.finalWarnMessage
      : settings.weekWarnMessage,
    defaultMessageKey: isFinal
      ? "inactiveKick:default.final_warn_message"
      : "inactiveKick:default.week_warn_message",
    markerRoleId: settings.markerRoleId,
  });

  try {
    await sendPaginatedEmbeds({
      send: (payload) => channel.send(payload),
      pages: embeds,
      prefix: `${WARN_PAGINATOR_PREFIX}:${nextWarnStage}`,
      timeMs: NOTIFICATION_COLLECTOR_MS,
      content,
      // 本文に {markerRole} が含まれていた場合のみ実際にメンションされる
      ...(settings.markerRoleId
        ? { allowedMentionRoleIds: [settings.markerRoleId] }
        : {}),
    });
  } catch (err) {
    // 送信失敗時は warnStage を前進させない（次回再試行・キックしない）
    logger.error(
      logPrefixed(LOG_PREFIX, "inactiveKick:log.notification_failed", {
        guildId: guild.id,
        stage: String(nextWarnStage),
      }),
      err,
    );
    return;
  }

  // 送信成功 → warnStage を永続化
  const activityRepo = getBotMemberActivityRepository();
  for (const candidate of candidates) {
    await activityRepo
      .setWarnStage(guild.id, candidate.userId, nextWarnStage)
      .catch(() => {});
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

  const testMode = env.TEST_MODE === true;
  const t = await getGuildTranslator(guild.id);
  const activityRepo = getBotMemberActivityRepository();
  const kickedNames: string[] = [];

  for (const candidate of candidates) {
    // 退出後はメンションが解決されないため表示名を控える（H4）
    const displayName = candidate.displayName;

    if (testMode) {
      // テストモード: 実キックせず「対象だった」旨のみ
      kickedNames.push(displayName);
      continue;
    }

    const member = await guild.members
      .fetch(candidate.userId)
      .catch(() => null);
    if (!member) continue;

    // Bot より上位ロール・オーナー等でキック不能ならスキップ
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
      kickedNames.push(displayName);
      // キックで発火する guildMemberRemove でも掃除されるため冪等
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

  if (kickedNames.length === 0) return;

  const { content, embeds } = buildKickNotification(kickedNames, {
    t,
    serverName: guild.name,
    thresholdDays: settings.thresholdDays,
    customMessage: settings.kickMessage,
    testMode,
  });
  await sendPaginatedEmbeds({
    send: (payload) => channel.send(payload),
    pages: embeds,
    prefix: KICK_PAGINATOR_PREFIX,
    timeMs: NOTIFICATION_COLLECTOR_MS,
    content,
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
 * 1 ギルドの日次チェックを処理する。
 * @param client Bot クライアント
 * @param settings 有効なギルドの設定
 */
export async function processGuildInactiveKick(
  client: BotClient,
  settings: InactiveKickSettings & { guildId: string },
): Promise<void> {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return;

  const settingsService = getBotInactiveKickSettingsService();

  // バリデーション: しきい値範囲
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

  // バリデーション: 通知チャンネル
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

  // メンバー取得
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

  const now = new Date();
  const buckets = await buildCandidateBuckets(guild, members, settings, now);

  // 1. 除外メンバーの猶予クリア
  await applyGraceClear(guild, buckets, settings.markerRoleId);

  // 2. 対象ロール付与（警告段階の週通知・最終警告対象へ）
  if (settings.markerRoleId) {
    await assignMarkerRoles(
      guild,
      [...buckets.weekWarn, ...buckets.finalWarn],
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
  await sendStageNotification(
    guild,
    channel,
    buckets.finalWarn,
    WARN_STAGE.FINAL,
    settings,
    now,
  );

  // 4. キック実行 + 通知
  await processKicks(guild, channel, buckets.kick, settings);
}

/**
 * 全ギルドの日次チェックを実行する（per-guild エラー隔離）。
 * @param client Bot クライアント
 */
export async function runInactiveKickDailyCheck(
  client: BotClient,
): Promise<void> {
  logger.info(logPrefixed(LOG_PREFIX, "inactiveKick:log.daily_check_started"));

  const settingsList =
    await getBotInactiveKickSettingsService().getAllEnabled();

  let processed = 0;
  for (const settings of settingsList) {
    try {
      await processGuildInactiveKick(client, settings);
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
