// src/features/inactive-kick/commands/inactiveKickSettingsCommand.simple.ts
// inactive-kick-settings の単純設定系サブコマンド（set-channel / set-threshold / enable / disable）

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  INACTIVE_KICK_THRESHOLD_MAX_DAYS,
  INACTIVE_KICK_THRESHOLD_MIN_DAYS,
} from "../inactiveKickSettingsDefaults";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

const LOG_PREFIX = "system:log_prefix.inactive_kick";

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

/**
 * 通知チャンネルを設定する。
 */
export async function handleInactiveKickSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const channelOption = interaction.options.getChannel(
    INACTIVE_KICK_SETTINGS_COMMAND.OPTION.CHANNEL,
    true,
  );
  // 権限判定のため完全な GuildChannel を解決する
  const channel = await interaction.guild?.channels
    .fetch(channelOption.id)
    .catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.text_channel_only",
      ),
    );
  }

  // Bot の送信権限を確認
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
        "inactiveKick:user-response.channel_bot_permission",
      ),
    );
  }

  await getBotInactiveKickSettingsService().setChannelId(guildId, channel.id);
  await replySuccess(
    interaction,
    "inactiveKick:user-response.set_channel_success",
    {
      channel: `<#${channel.id}>`,
    },
  );
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "set-channel",
    }),
  );
}

/**
 * 非アクティブ判定日数（しきい値）を設定する。
 */
export async function handleInactiveKickSetThreshold(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const days = interaction.options.getInteger(
    INACTIVE_KICK_SETTINGS_COMMAND.OPTION.DAYS,
    true,
  );
  if (
    days < INACTIVE_KICK_THRESHOLD_MIN_DAYS ||
    days > INACTIVE_KICK_THRESHOLD_MAX_DAYS
  ) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.threshold_out_of_range",
      ),
    );
  }

  await getBotInactiveKickSettingsService().setThresholdDays(guildId, days);
  await replySuccess(
    interaction,
    "inactiveKick:user-response.set_threshold_success",
    {
      days,
    },
  );
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "set-threshold",
    }),
  );
}

/**
 * 機能を有効化する（通知チャンネル設定済みが前提・enabledAt を更新）。
 */
export async function handleInactiveKickEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const service = getBotInactiveKickSettingsService();
  const settings = await service.getSettingsOrDefault(guildId);
  if (!settings.channelId) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.enable_error_no_channel",
      ),
    );
  }

  await service.enable(guildId, new Date());
  await replySuccess(interaction, "inactiveKick:user-response.enable_success");
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "enable",
    }),
  );
}

/**
 * 機能を無効化する。
 */
export async function handleInactiveKickDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  await getBotInactiveKickSettingsService().disable(guildId);
  await replySuccess(interaction, "inactiveKick:user-response.disable_success");
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "disable",
    }),
  );
}
