// src/features/unverified-kick/services/unverifiedKickRunner.ts
// 未承認ユーザー自動キックの日次チェック本体（候補抽出 → 事前警告〔DM + 通知〕→ キック実行）

import {
  ChannelType,
  type Guild,
  type GuildMember,
  PermissionFlagsBits,
  type SendableChannels,
} from "discord.js";
import cron from "node-cron";
import type { BotClient } from "../../../bot/client";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { sendPaginatedEmbeds } from "../../../bot/shared/embedPaginator";
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
} from "./unverifiedKickNotifier";

/** 日次チェックジョブの固定 ID */
export const UNVERIFIED_KICK_JOB_ID = "unverified-kick:daily-check";
/** 日次チェックの cron 式（毎日 03:00） */
export const UNVERIFIED_KICK_JOB_SCHEDULE = "0 3 * * *";
/** 日次チェックのタイムゾーン */
export const UNVERIFIED_KICK_JOB_TIMEZONE = "Asia/Tokyo";

/** キック予告チャンネルのページネーター有効時間（1 時間） */
const NOTIFICATION_COLLECTOR_MS = 60 * 60 * 1000;
/** ページネーター customId プレフィックス */
const WARN_PAGINATOR_PREFIX = "unverified-kick:notify-warn";
const KICK_PAGINATOR_PREFIX = "unverified-kick:notify-kick";

const LOG_PREFIX = "system:log_prefix.unverified_kick";

/**
 * 日次チェックの cron 式を解決する。
 * `UNVERIFIED_KICK_CRON`（dev/検証用の上書き）が有効な cron 式なら優先し、
 * 未設定・不正なら既定（毎日 03:00）を用いる。
 * @returns 使用する cron 式
 */
export function resolveUnverifiedKickSchedule(): string {
  const override = env.UNVERIFIED_KICK_CRON;
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

/**
 * GuildMember を区分用の正規化形へ変換する。
 */
function toCandidateInput(
  member: GuildMember,
  guild: Guild,
  verifiedRoleId: string | undefined,
  markerRoleId: string | undefined,
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
  };
}

/**
 * ギルドメンバーから候補区分を算出する（日次チェックと preview で共有）。
 * @param guild 対象ギルド
 * @param members 取得済みのギルドメンバー一覧
 * @param settings 区分に用いる設定
 * @param now 現在時刻
 * @returns 区分結果
 */
export function buildCandidateBuckets(
  guild: Guild,
  members: GuildMember[],
  settings: UnverifiedKickSettings,
  now: Date,
): CandidateBuckets {
  const normalized = members.map((m) =>
    toCandidateInput(m, guild, settings.verifiedRoleId, settings.markerRoleId),
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
  // warn 対象は全員 ageDays == warnDays のため残日数は共通
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
    // DM 拒否・送信失敗は握りつぶす（仕様）
    await member?.send({ content: body }).catch(() => {});
  }
}

/**
 * キック予告（通知チャンネル）を送信する。対象ロール設定時は本文でメンションする。
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
    customMessage: settings.notifyTemplate,
    markerRoleId: settings.markerRoleId,
  });

  await sendPaginatedEmbeds({
    send: (payload) => channel.send(payload),
    pages: embeds,
    prefix: WARN_PAGINATOR_PREFIX,
    timeMs: NOTIFICATION_COLLECTOR_MS,
    ...(content ? { content } : {}),
    // 本文に対象ロールメンションを含むときのみピングを許可
    ...(settings.markerRoleId
      ? { allowedMentionRoleIds: [settings.markerRoleId] }
      : {}),
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
 * キック対象を処理し、ログチャンネルへキックサマリーを送信する。
 */
async function processKicks(
  guild: Guild,
  logChannel: SendableChannels | null,
  candidates: CategorizedCandidate[],
  settings: UnverifiedKickSettings,
): Promise<void> {
  if (candidates.length === 0) return;

  const testMode = env.TEST_MODE === true;
  const t = await getGuildTranslator(guild.id);
  // ユーザーメンション `<@id>` は退出後もグローバルに解決されるため userId を控える
  const kickedUserIds: string[] = [];

  for (const candidate of candidates) {
    if (testMode) {
      kickedUserIds.push(candidate.userId);
      continue;
    }

    const member = await guild.members
      .fetch(candidate.userId)
      .catch(() => null);
    if (!member) continue;

    // Bot より上位ロール・オーナー等でキック不能ならスキップ
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
      kickedUserIds.push(candidate.userId);
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

  if (kickedUserIds.length === 0 || !logChannel) return;

  const { embeds } = buildKickNotification(kickedUserIds, {
    t,
    verifiedRoleId: settings.verifiedRoleId,
    testMode,
  });
  await sendPaginatedEmbeds({
    send: (payload) => logChannel.send(payload),
    pages: embeds,
    prefix: KICK_PAGINATOR_PREFIX,
    timeMs: NOTIFICATION_COLLECTOR_MS,
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
 * @returns 送信可能なチャンネル（不正・権限不足なら null）
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
 * 1 ギルドの日次チェックを処理する。
 * @param client Bot クライアント
 * @param settings 有効なギルドの設定
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

  const now = new Date();
  const buckets = buildCandidateBuckets(guild, members, settings, now);

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
    // 通知投稿の直前に対象ロールを付与（メンション解決のため）
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
  }

  // 3. キック実行 + ログ
  await processKicks(guild, logChannel, buckets.kick, settings);
}

/**
 * 全ギルドの日次チェックを実行する（per-guild エラー隔離）。
 * @param client Bot クライアント
 */
export async function runUnverifiedKickDailyCheck(
  client: BotClient,
): Promise<void> {
  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.daily_check_started"),
  );

  const settingsList =
    await getBotUnverifiedKickSettingsService().getAllEnabled();

  let processed = 0;
  for (const settings of settingsList) {
    try {
      await processGuildUnverifiedKick(client, settings);
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
