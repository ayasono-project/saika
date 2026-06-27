// src/features/unverified-kick/services/unverifiedKickRunner.ts
// 未承認ユーザー自動キックの時間単位スイープ（候補抽出 → 事前警告〔DM + 通知〕→ キック実行）

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
  getBotUnverifiedKickSettingsService,
  getBotUnverifiedKickWarnRepository,
} from "../../../bot/services/botCompositionRoot";
import { sendNotification } from "../../../bot/shared/notificationSender";
import { env } from "../../../shared/config/env";
import type { UnverifiedKickSettings } from "../../../shared/database/types";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  UNVERIFIED_KICK_GRACE_MAX_DAYS,
  UNVERIFIED_KICK_GRACE_MIN_DAYS,
} from "../unverifiedKickSettingsDefaults";
import {
  type CandidateBuckets,
  type CandidateMemberInput,
  type CategorizedCandidate,
  categorizeCandidates,
} from "./unverifiedKickCandidates";
import {
  buildDisableNotification,
  buildDmMessage,
  buildKickNotification,
  buildWarnNotification,
  type KickedMember,
} from "./unverifiedKickNotifier";
import {
  buildObsoleteUnverifiedKickNotice,
  detectObsoleteUnverifiedKickPlaceholders,
} from "./unverifiedKickObsoletePlaceholders";

/** 日次チェックジョブの固定 ID */
export const UNVERIFIED_KICK_JOB_ID = "unverified-kick:daily-check";
/** スイープの cron 式（毎時 0 分）。per-guild の timezone/runHour でフィルタリングする */
export const UNVERIFIED_KICK_JOB_SCHEDULE = "0 * * * *";

const LOG_PREFIX = "system:log_prefix.unverified_kick";

/**
 * スイープの cron 式を解決する。
 * `UNVERIFIED_KICK_CRON`（dev/検証用の上書き）が有効な cron 式なら優先し、
 * 未設定・不正なら毎時スイープを使う。
 */
export function resolveUnverifiedKickSchedule(): string {
  const override = env.UNVERIFIED_KICK_CRON_OVERRIDE;
  if (!override) return UNVERIFIED_KICK_JOB_SCHEDULE;
  if (cron.validate(override)) {
    logger.warn(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.cron_override", {
        schedule: override,
      }),
    );
    return override;
  }
  logger.warn(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.cron_invalid", {
      schedule: UNVERIFIED_KICK_JOB_SCHEDULE,
    }),
  );
  return UNVERIFIED_KICK_JOB_SCHEDULE;
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
  verifiedRoleId: string | undefined,
  markerRoleId: string | undefined,
  warnedAt: Date | null,
): CandidateMemberInput {
  return {
    userId: member.id,
    isBot: member.user.bot,
    isOwner: member.id === guild.ownerId,
    isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
    isVerified: verifiedRoleId ? member.roles.cache.has(verifiedRoleId) : false,
    memberRoleIds: [...member.roles.cache.keys()],
    joinedAt: member.joinedAt,
    hasMarkerRole: markerRoleId ? member.roles.cache.has(markerRoleId) : false,
    warnedAt,
  };
}

/**
 * ギルドメンバーから候補区分を算出する（日次チェックと preview で共有）。
 */
export function buildCandidateBuckets(
  guild: Guild,
  members: GuildMember[],
  settings: UnverifiedKickSettings,
  now: Date,
  warnedMap: Map<string, Date>,
): CandidateBuckets {
  const normalized = members.map((m) =>
    toCandidateInput(
      m,
      guild,
      settings.verifiedRoleId,
      settings.markerRoleId,
      warnedMap.get(m.id) ?? null,
    ),
  );
  return categorizeCandidates(normalized, settings, now);
}

/**
 * 対象ロール掃除（除外対象だが対象ロールを保持しているメンバーから剥奪）を行う。
 */
async function applyMarkerCleanup(
  guild: Guild,
  userIds: string[],
  markerRoleId: string,
): Promise<void> {
  for (const userId of userIds) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      await member?.roles
        .remove(markerRoleId)
        .catch((err) => logMarkerRemoveFailed(guild.id, userId, err));
    } catch (err) {
      logMarkerRemoveFailed(guild.id, userId, err);
    }
  }
}

function logMarkerRemoveFailed(
  guildId: string,
  userId: string,
  err: unknown,
): void {
  logger.warn(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.marker_role_remove_failed", {
      guildId,
      userId,
    }),
    err,
  );
}

/**
 * 警告対象へ対象ロールを付与する（未付与のもののみ・通知投稿の直前に呼ぶ）。
 */
async function assignMarkerRoles(
  guild: Guild,
  warnCandidates: CategorizedCandidate[],
  markerRoleId: string,
): Promise<void> {
  const t = await getGuildTranslator(guild.id);
  for (const candidate of warnCandidates) {
    if (candidate.hasMarkerRole) continue;
    try {
      const member = await guild.members
        .fetch(candidate.userId)
        .catch(() => null);
      await member?.roles.add(
        markerRoleId,
        t("unverifiedKick:audit_reason.marker_assigned"),
      );
    } catch (err) {
      logger.warn(
        logPrefixed(
          LOG_PREFIX,
          "unverifiedKick:log.marker_role_assign_failed",
          { guildId: guild.id, userId: candidate.userId },
        ),
        err,
      );
    }
  }
}

/**
 * 警告対象へ DM を送信する（拒否・失敗は握りつぶす・救済手段なし）。
 */
async function sendWarnDms(
  guild: Guild,
  candidates: CategorizedCandidate[],
  settings: UnverifiedKickSettings,
): Promise<void> {
  if (candidates.length === 0) return;
  const t = await getGuildTranslator(guild.id);
  const warnDays = settings.warnDays ?? 0;
  const body = buildDmMessage({
    t,
    serverName: guild.name,
    graceDays: settings.graceDays,
    warnDays,
    remainingDays: Math.max(0, settings.graceDays - warnDays),
    customMessage: settings.dmTemplate,
  });

  for (const candidate of candidates) {
    const member = await guild.members
      .fetch(candidate.userId)
      .catch(() => null);
    await member?.send({ content: body }).catch(() => {});
  }
}

/**
 * キック予告（通知チャンネル）を送信する。
 */
async function sendWarnNotification(
  guild: Guild,
  channel: SendableChannels,
  candidates: CategorizedCandidate[],
  settings: UnverifiedKickSettings,
  now: Date,
): Promise<void> {
  if (candidates.length === 0) return;
  const t = await getGuildTranslator(guild.id);
  const { content, embeds } = buildWarnNotification(candidates, {
    t,
    now,
    serverName: guild.name,
    graceDays: settings.graceDays,
    warnDays: settings.warnDays ?? 0,
    timezone: settings.timezone,
    runHour: settings.runHour,
    mentionEnabled: settings.mentionEnabled,
    customMessage: settings.notifyTemplate,
  });

  await sendNotification((payload) => channel.send(payload), {
    content,
    embeds,
  }).catch((err) => {
    logger.error(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.notification_failed", {
        guildId: guild.id,
        stage: "warn",
      }),
      err,
    );
  });
}

/**
 * 廃止プレースホルダーが検出されたときに案内 Embed をチャンネルへ送信する。
 * logChannel を優先し、なければ notifyChannel へ送る。
 */
async function sendObsoleteUnverifiedKickNotice(
  guild: Guild,
  logChannel: SendableChannels | null,
  notifyChannel: SendableChannels | null,
  settings: { notifyTemplate?: string | null; dmTemplate?: string | null },
): Promise<void> {
  const detected = detectObsoleteUnverifiedKickPlaceholders(settings);
  if (!detected.hasMarkerRole) return;
  const channel = logChannel ?? notifyChannel;
  if (!channel) return;
  const t = await getGuildTranslator(guild.id);
  const notice = buildObsoleteUnverifiedKickNotice(t, detected);
  if (notice) {
    await channel.send({ embeds: [notice] }).catch((err) => {
      logger.error(
        logPrefixed(LOG_PREFIX, "unverifiedKick:log.notification_failed", {
          guildId: guild.id,
          stage: "obsolete_notice",
        }),
        err,
      );
    });
  }
}

/**
 * キック対象を処理し、ログチャンネルへキックサマリーを送信する。
 */
async function processKicks(
  guild: Guild,
  logChannel: SendableChannels | null,
  candidates: CategorizedCandidate[],
  settings: UnverifiedKickSettings,
): Promise<void> {
  if (candidates.length === 0) return;

  const testMode = env.UNVERIFIED_KICK_DRY_RUN;
  const t = await getGuildTranslator(guild.id);
  const kicked: KickedMember[] = [];

  for (const candidate of candidates) {
    if (testMode) {
      const member = await guild.members
        .fetch(candidate.userId)
        .catch(() => null);
      kicked.push({
        userId: candidate.userId,
        displayName: member?.displayName ?? candidate.userId,
      });
      continue;
    }

    const member = await guild.members
      .fetch(candidate.userId)
      .catch(() => null);
    if (!member) continue;

    if (!member.kickable) {
      logger.warn(
        logPrefixed(LOG_PREFIX, "unverifiedKick:log.kick_skipped_unkickable", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
      );
      continue;
    }

    try {
      await member.kick(
        t("unverifiedKick:audit_reason.kick", { days: settings.graceDays }),
      );
      kicked.push({ userId: member.id, displayName: member.displayName });
      logger.info(
        logPrefixed(LOG_PREFIX, "unverifiedKick:log.kicked", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
      );
    } catch (err) {
      logger.error(
        logPrefixed(LOG_PREFIX, "unverifiedKick:log.kick_failed", {
          guildId: guild.id,
          userId: candidate.userId,
        }),
        err,
      );
    }
  }

  if (kicked.length === 0 || !logChannel) return;

  const { embeds } = buildKickNotification(kicked, {
    t,
    verifiedRoleId: settings.verifiedRoleId,
    testMode,
  });
  await sendNotification((payload) => logChannel.send(payload), {
    embeds,
  }).catch((err) => {
    logger.error(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.notification_failed", {
        guildId: guild.id,
        stage: "kick",
      }),
      err,
    );
  });
}

/**
 * テキストチャンネルを解決し、Bot が Embed を送信できるかを検証する。
 */
async function resolveSendableChannel(
  guild: Guild,
  channelId: string | undefined,
): Promise<SendableChannels | null> {
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return null;
  const me = guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (
    !perms?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    return null;
  }
  return channel;
}

/**
 * バリデーション失敗で機能を無効化し、ログチャンネルが使えれば通知する。
 */
async function disableAndNotify(
  guild: Guild,
  logChannelId: string | undefined,
  reasonKey: Parameters<Awaited<ReturnType<typeof getGuildTranslator>>>[0],
  reasonCode: string,
): Promise<void> {
  await getBotUnverifiedKickSettingsService().disableInvalid(guild.id);
  logger.warn(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.guild_disabled_invalid", {
      guildId: guild.id,
      reason: reasonCode,
    }),
  );
  const channel = await resolveSendableChannel(guild, logChannelId);
  if (!channel) return;
  const t = await getGuildTranslator(guild.id);
  await channel
    .send({ embeds: [buildDisableNotification(t, t(reasonKey))] })
    .catch(() => {});
}

/**
 * `UNVERIFIED_KICK_MOCK_MEMBERS` 用のモックバケットを生成する。
 * graceDays / warnDays を基準に警告・キックを count 件に分配する。
 */
function buildMockUnverifiedKickBuckets(
  count: number,
  settings: UnverifiedKickSettings,
): CandidateBuckets {
  const { graceDays, warnDays } = settings;
  const effectiveWarnDays = warnDays ?? 0;

  return {
    warn: Array.from({ length: count }, (_, i) => ({
      userId: `mock-uv-warn-${i}`,
      ageDays: graceDays - effectiveWarnDays + 1,
      remainingDays: Math.max(0, effectiveWarnDays - 1),
      hasMarkerRole: false,
    })),
    kick: Array.from({ length: count }, (_, i) => ({
      userId: `mock-uv-kick-${i}`,
      ageDays: graceDays + 1,
      remainingDays: 0,
      hasMarkerRole: true,
    })),
    markerCleanup: [],
    clearWarn: [],
  };
}

/**
 * 1 ギルドのスイープ処理を行う。
 */
export async function processGuildUnverifiedKick(
  client: BotClient,
  settings: UnverifiedKickSettings & { guildId: string },
): Promise<void> {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return;

  // バリデーション: 猶予日数範囲
  if (
    settings.graceDays < UNVERIFIED_KICK_GRACE_MIN_DAYS ||
    settings.graceDays > UNVERIFIED_KICK_GRACE_MAX_DAYS
  ) {
    await disableAndNotify(
      guild,
      settings.logChannelId,
      "unverifiedKick:user-response.grace_out_of_range",
      "grace_out_of_range",
    );
    return;
  }

  // バリデーション: 認証ロール設定 + 存在
  if (!settings.verifiedRoleId) {
    await disableAndNotify(
      guild,
      settings.logChannelId,
      "unverifiedKick:user-response.disabled_no_verified_role",
      "no_verified_role",
    );
    return;
  }
  const verifiedRole = await guild.roles
    .fetch(settings.verifiedRoleId)
    .catch(() => null);
  if (!verifiedRole) {
    await disableAndNotify(
      guild,
      settings.logChannelId,
      "unverifiedKick:user-response.disabled_verified_role_missing",
      "verified_role_missing",
    );
    return;
  }

  // バリデーション: Bot の KickMembers 権限
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
    await disableAndNotify(
      guild,
      settings.logChannelId,
      "unverifiedKick:user-response.disabled_no_kick_permission",
      "no_kick_permission",
    );
    return;
  }

  // 通知 / ログチャンネルを解決（不正なら null = 当該通知のみスキップ・キックは継続）
  const notifyChannel = await resolveSendableChannel(
    guild,
    settings.notifyChannelId,
  );
  const logChannel = await resolveSendableChannel(guild, settings.logChannelId);

  const now = new Date();

  // UNVERIFIED_KICK_MOCK_MEMBERS が設定されていればモックデータで通知のみ実行（DB/Guild fetch を省略）
  const mockCount = env.UNVERIFIED_KICK_MOCK_MEMBERS;
  if (mockCount != null && mockCount > 0) {
    const mockBuckets = buildMockUnverifiedKickBuckets(mockCount, settings);
    if (mockBuckets.warn.length > 0 && notifyChannel) {
      await sendWarnNotification(
        guild,
        notifyChannel,
        mockBuckets.warn,
        settings,
        now,
      );
    }
    if (mockBuckets.warn.length > 0) {
      await sendObsoleteUnverifiedKickNotice(guild, logChannel, notifyChannel, {
        notifyTemplate: settings.notifyTemplate,
        dmTemplate: settings.dmTemplate,
      });
    }
    await processKicks(guild, logChannel, mockBuckets.kick, settings);
    return;
  }

  // メンバー取得
  let members: GuildMember[];
  try {
    members = [...(await guild.members.fetch()).values()];
  } catch (err) {
    logger.error(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.members_fetch_failed", {
        guildId: guild.id,
      }),
      err,
    );
    return;
  }

  const warnRepo = getBotUnverifiedKickWarnRepository();
  const warnedMap = await warnRepo.getWarnedMap(guild.id);

  const buckets = buildCandidateBuckets(
    guild,
    members,
    settings,
    now,
    warnedMap,
  );

  // 1. 対象ロール掃除（除外済み・認証済みの保持者から剥奪）
  if (settings.markerRoleId && buckets.markerCleanup.length > 0) {
    await applyMarkerCleanup(
      guild,
      buckets.markerCleanup,
      settings.markerRoleId,
    );
  }

  // 2. 事前警告（DM + 通知チャンネル）。warnDays 未設定なら warn バケットは空
  if (buckets.warn.length > 0) {
    if (settings.markerRoleId) {
      await assignMarkerRoles(guild, buckets.warn, settings.markerRoleId);
    }
    await sendWarnDms(guild, buckets.warn, settings);
    if (notifyChannel) {
      await sendWarnNotification(
        guild,
        notifyChannel,
        buckets.warn,
        settings,
        now,
      );
    }
    // 警告済みとして記録（DM 拒否でも記録・サイレントキック防止の起点）
    await warnRepo.recordWarned(
      guild.id,
      buckets.warn.map((c) => c.userId),
      now,
    );
    await sendObsoleteUnverifiedKickNotice(guild, logChannel, notifyChannel, {
      notifyTemplate: settings.notifyTemplate,
      dmTemplate: settings.dmTemplate,
    });
  }

  // 3. キック実行 + ログ
  await processKicks(guild, logChannel, buckets.kick, settings);

  // 4. 失効した警告記録を削除（認証済み/再参加リセット/警告無効化 + 退出メンバー）
  const memberIds = new Set(members.map((m) => m.id));
  const leftWarnIds = [...warnedMap.keys()].filter((id) => !memberIds.has(id));
  const staleWarnIds = [...new Set([...buckets.clearWarn, ...leftWarnIds])];
  if (staleWarnIds.length > 0) {
    await warnRepo.deleteWarned(guild.id, staleWarnIds);
  }
}

/**
 * 全ギルドのスイープを実行する。
 * per-guild の timezone/runHour フィルタと lastRunDate ガードを適用する。
 */
export async function runUnverifiedKickDailyCheck(
  client: BotClient,
): Promise<void> {
  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.daily_check_started"),
  );

  const settingsList =
    await getBotUnverifiedKickSettingsService().getAllEnabled();
  const now = new Date();

  const skipGuards = env.UNVERIFIED_KICK_SKIP_GUARDS;
  let processed = 0;
  for (const settings of settingsList) {
    const timezone = settings.timezone;
    const currentHour = getHourInTimezone(now, timezone);
    if (!skipGuards && currentHour !== settings.runHour) continue;

    const todayStr = getLocalDateString(now, timezone);
    if (!skipGuards && settings.lastRunDate === todayStr) continue;

    try {
      await processGuildUnverifiedKick(client, settings);
      await getBotUnverifiedKickSettingsService()
        .updateLastRunDate(settings.guildId, todayStr)
        .catch(() => {});
      processed += 1;
    } catch (err) {
      logger.error(
        logPrefixed(LOG_PREFIX, "unverifiedKick:log.guild_check_failed", {
          guildId: settings.guildId,
        }),
        err,
      );
    }
  }

  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.daily_check_completed", {
      guildCount: processed,
    }),
  );
}
