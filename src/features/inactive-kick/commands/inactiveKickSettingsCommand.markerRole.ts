// src/features/inactive-kick/commands/inactiveKickSettingsCommand.markerRole.ts
// inactive-kick-settings の対象ロール系サブコマンド（set-marker-role / clear-marker-role）

import { ValidationError } from "@ayasono/shared/core";
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

const LOG_PREFIX = "system:log_prefix.inactive_kick";

/**
 * 対象ロールを設定する（Bot の ManageRoles 権限 + ロール階層を検証）。
 */
export async function handleInactiveKickSetMarkerRole(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const role = interaction.options.getRole(
    INACTIVE_KICK_SETTINGS_COMMAND.OPTION.ROLE,
    true,
  );

  const me = interaction.guild?.members.me;
  // Bot に「ロールの管理」権限が必要
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.marker_role_bot_permission",
      ),
    );
  }
  // 対象ロールは Bot の最上位ロールより下位である必要がある
  if (me.roles.highest.comparePositionTo(role.id) <= 0) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.set_marker_role_error_hierarchy",
      ),
    );
  }

  await getBotInactiveKickSettingsService().setMarkerRole(guildId, role.id);

  const embed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "inactiveKick:user-response.set_marker_role_success",
      { role: `<@&${role.id}>` },
    ),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "set-marker-role",
    }),
  );
}

/**
 * 対象ロール連携を解除する（既存付与ロールは一括剥奪しない）。
 */
export async function handleInactiveKickClearMarkerRole(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  await getBotInactiveKickSettingsService().clearMarkerRole(guildId);

  const embed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "inactiveKick:user-response.clear_marker_role_success",
    ),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  logger.info(
    logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
      guildId,
      action: "clear-marker-role",
    }),
  );
}
