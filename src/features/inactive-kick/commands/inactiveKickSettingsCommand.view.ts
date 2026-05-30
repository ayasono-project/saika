// src/features/inactive-kick/commands/inactiveKickSettingsCommand.view.ts
// inactive-kick-settings view 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { env } from "../../../shared/config/env";
import { tInteraction } from "../../../shared/locale/localeManager";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/**
 * 現在の非アクティブ自動キック設定を表示する。
 */
export async function handleInactiveKickView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const locale = interaction.locale;
  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);

  const enabled = tInteraction(locale, "common:enabled");
  const disabled = tInteraction(locale, "common:disabled");
  const none = tInteraction(locale, "common:none");
  const set = tInteraction(
    locale,
    "inactiveKick:embed.field.value.message_set",
  );

  const enabledAtValue = settings.enabledAt
    ? `<t:${Math.floor(settings.enabledAt.getTime() / 1000)}:f>`
    : none;

  const embed = createInfoEmbed("", {
    title: tInteraction(locale, "inactiveKick:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: settings.enabled ? enabled : disabled,
        inline: true,
      },
      {
        name: tInteraction(locale, "inactiveKick:embed.field.name.channel"),
        value: settings.channelId ? `<#${settings.channelId}>` : none,
        inline: true,
      },
      {
        name: tInteraction(locale, "inactiveKick:embed.field.name.threshold"),
        value: tInteraction(
          locale,
          "inactiveKick:embed.field.value.threshold_days",
          { count: settings.thresholdDays },
        ),
        inline: true,
      },
      {
        name: tInteraction(locale, "inactiveKick:embed.field.name.enabled_at"),
        value: enabledAtValue,
        inline: true,
      },
      {
        name: tInteraction(locale, "inactiveKick:embed.field.name.marker_role"),
        value: settings.markerRoleId ? `<@&${settings.markerRoleId}>` : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "inactiveKick:embed.field.name.warn_message",
        ),
        value: settings.warnMessage ? set : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "inactiveKick:embed.field.name.kick_message",
        ),
        value: settings.kickMessage ? set : none,
        inline: true,
      },
      {
        name: tInteraction(locale, "inactiveKick:embed.field.name.whitelist"),
        value: tInteraction(
          locale,
          "inactiveKick:embed.field.value.whitelist_counts",
          {
            roles: settings.whitelistRoleIds.length,
            users: settings.whitelistUserIds.length,
          },
        ),
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "inactiveKick:embed.field.name.test_mode_status",
        ),
        value: env.TEST_MODE ? enabled : disabled,
        inline: true,
      },
    ],
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
