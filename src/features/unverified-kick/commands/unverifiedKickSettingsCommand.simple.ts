// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.simple.ts
// unverified-kick-settings の単純設定系サブコマンド（ロール / 日数 / チャンネル / enable / disable）

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  UNVERIFIED_KICK_GRACE_MAX_DAYS,
  UNVERIFIED_KICK_GRACE_MIN_DAYS,
  UNVERIFIED_KICK_WARN_MIN_DAYS,
} from "../unverifiedKickSettingsDefaults";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "./unverifiedKickSettingsCommand.constants";

const LOG_PREFIX = "system:log_prefix.unverified_kick";
const { OPTION } = UNVERIFIED_KICK_SETTINGS_COMMAND;

/** ephemeral 成功応答を返す共通ヘルパー */
async function replySuccess(
  interaction: ChatInputCommandInteraction,
  descriptionKey: AllParseKeys,
  params?: Record<string, unknown>,
): Promise<void> {
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, descriptionKey, params),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/** 設定更新ログを出力する共通ヘルパー */
function logUpdated(guildId: string, action: string): void {
  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.config_updated", {
      guildId,
      action,
    }),
  );
}

/**
 * 認証ロールを設定する（ロールがギルドに存在するか確認）。
 */
export async function handleUnverifiedKickSetVerifiedRole(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const role = interaction.options.getRole(OPTION.ROLE, true);
  await getBotUnverifiedKickSettingsService().setVerifiedRole(guildId, role.id);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.set_verified_role_success",
    { role: `<@&${role.id}>` },
  );
  logUpdated(guildId, "set-verified-role");
}

/**
 * 猶予日数を設定する（範囲 + warnDays との整合を検証）。
 */
export async function handleUnverifiedKickSetGraceDays(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const days = interaction.options.getInteger(OPTION.DAYS, true);
  if (
    days < UNVERIFIED_KICK_GRACE_MIN_DAYS ||
    days > UNVERIFIED_KICK_GRACE_MAX_DAYS
  ) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.grace_out_of_range",
      ),
    );
  }

  const service = getBotUnverifiedKickSettingsService();
  const settings = await service.getSettingsOrDefault(guildId);
  // warnDays が新しい graceDays 以上になる場合は拒否（警告がキック以降になり無意味）
  if (settings.warnDays !== undefined && settings.warnDays >= days) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.grace_below_warn",
      ),
    );
  }

  await service.setGraceDays(guildId, days);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.set_grace_days_success",
    { days },
  );
  logUpdated(guildId, "set-grace-days");
}

/**
 * 警告日数を設定する（1 以上かつ graceDays 未満）。
 */
export async function handleUnverifiedKickSetWarnDays(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const days = interaction.options.getInteger(OPTION.DAYS, true);
  const service = getBotUnverifiedKickSettingsService();
  const settings = await service.getSettingsOrDefault(guildId);
  if (days < UNVERIFIED_KICK_WARN_MIN_DAYS || days >= settings.graceDays) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.warn_out_of_range",
      ),
    );
  }

  await service.setWarnDays(guildId, days);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.set_warn_days_success",
    { days },
  );
  logUpdated(guildId, "set-warn-days");
}

/**
 * 警告日数を解除する（事前警告を無効化）。
 */
export async function handleUnverifiedKickClearWarnDays(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  await getBotUnverifiedKickSettingsService().clearWarnDays(guildId);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.clear_warn_days_success",
  );
  logUpdated(guildId, "clear-warn-days");
}

/** 通知系チャンネル（テキスト）を解決し Bot の送信権限を検証する共通ヘルパー */
async function resolveTextChannel(
  interaction: ChatInputCommandInteraction,
): Promise<{ id: string }> {
  const channelOption = interaction.options.getChannel(OPTION.CHANNEL, true);
  const channel = await interaction.guild?.channels
    .fetch(channelOption.id)
    .catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.text_channel_only",
      ),
    );
  }
  const me = interaction.guild?.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (
    !perms?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.channel_bot_permission",
      ),
    );
  }
  return { id: channel.id };
}

/**
 * 通知チャンネル（キック予告）を設定する。
 */
export async function handleUnverifiedKickSetNotifyChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const channel = await resolveTextChannel(interaction);
  await getBotUnverifiedKickSettingsService().setNotifyChannel(
    guildId,
    channel.id,
  );
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.set_notify_channel_success",
    { channel: `<#${channel.id}>` },
  );
  logUpdated(guildId, "set-notify-channel");
}

/**
 * 通知チャンネルを解除する。
 */
export async function handleUnverifiedKickClearNotifyChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  await getBotUnverifiedKickSettingsService().clearNotifyChannel(guildId);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.clear_notify_channel_success",
  );
  logUpdated(guildId, "clear-notify-channel");
}

/**
 * ログチャンネル（監査）を設定する。
 */
export async function handleUnverifiedKickSetLogChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const channel = await resolveTextChannel(interaction);
  await getBotUnverifiedKickSettingsService().setLogChannel(
    guildId,
    channel.id,
  );
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.set_log_channel_success",
    { channel: `<#${channel.id}>` },
  );
  logUpdated(guildId, "set-log-channel");
}

/**
 * ログチャンネルを解除する。
 */
export async function handleUnverifiedKickClearLogChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  await getBotUnverifiedKickSettingsService().clearLogChannel(guildId);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.clear_log_channel_success",
  );
  logUpdated(guildId, "clear-log-channel");
}

/**
 * 機能を有効化する（認証ロール設定済み + Bot の KickMembers 権限が前提・enabledAt を更新）。
 */
export async function handleUnverifiedKickEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const service = getBotUnverifiedKickSettingsService();
  const settings = await service.getSettingsOrDefault(guildId);
  if (!settings.verifiedRoleId) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.enable_error_no_verified_role",
      ),
    );
  }
  // Bot に KickMembers 権限が必要
  if (
    !interaction.guild?.members.me?.permissions.has(
      PermissionFlagsBits.KickMembers,
    )
  ) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "unverifiedKick:user-response.enable_error_no_kick_permission",
      ),
    );
  }

  await service.enable(guildId, new Date());
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.enable_success",
  );
  logUpdated(guildId, "enable");
}

/**
 * 機能を無効化する。
 */
export async function handleUnverifiedKickDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  await getBotUnverifiedKickSettingsService().disable(guildId);
  await replySuccess(
    interaction,
    "unverifiedKick:user-response.disable_success",
  );
  logUpdated(guildId, "disable");
}
