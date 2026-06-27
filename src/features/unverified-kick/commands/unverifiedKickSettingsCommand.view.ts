// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.view.ts
// unverified-kick-settings view 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { env } from "../../../shared/config/env";
import { tInteraction } from "../../../shared/locale/localeManager";

/**
 * 現在の未承認ユーザー自動キック設定を表示する。
 */
export async function handleUnverifiedKickView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const locale = interaction.locale;
  const settings =
    await getBotUnverifiedKickSettingsService().getSettingsOrDefault(guildId);

  const enabled = tInteraction(locale, "common:enabled");
  const disabled = tInteraction(locale, "common:disabled");
  const none = tInteraction(locale, "common:none");

  const enabledAtValue = settings.enabledAt
    ? `<t:${Math.floor(settings.enabledAt.getTime() / 1000)}:f>`
    : none;

  const warnDaysValue =
    settings.warnDays !== undefined
      ? tInteraction(locale, "unverifiedKick:embed.field.value.warn_days", {
          count: settings.warnDays,
        })
      : disabled;

  const dmValue = settings.dmTemplate
    ? settings.dmTemplate
    : tInteraction(locale, "unverifiedKick:embed.field.value.dm_default");

  const notifyValue = settings.notifyTemplate
    ? settings.notifyTemplate
    : tInteraction(locale, "unverifiedKick:embed.field.value.dm_default");

  const embed = createInfoEmbed("", {
    title: tInteraction(locale, "unverifiedKick:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: settings.enabled ? enabled : disabled,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.verified_role",
        ),
        value: settings.verifiedRoleId
          ? `<@&${settings.verifiedRoleId}>`
          : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.grace_days",
        ),
        value: tInteraction(
          locale,
          "unverifiedKick:embed.field.value.grace_days",
          { count: settings.graceDays },
        ),
        inline: true,
      },
      {
        name: tInteraction(locale, "unverifiedKick:embed.field.name.warn_days"),
        value: warnDaysValue,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.notify_channel",
        ),
        value: settings.notifyChannelId
          ? `<#${settings.notifyChannelId}>`
          : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.log_channel",
        ),
        value: settings.logChannelId ? `<#${settings.logChannelId}>` : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.marker_role",
        ),
        value: settings.markerRoleId ? `<@&${settings.markerRoleId}>` : none,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.enabled_at",
        ),
        value: enabledAtValue,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.dm_message",
        ),
        value: dmValue,
        inline: false,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.notify_message",
        ),
        value: notifyValue,
        inline: false,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.exempt_roles",
        ),
        value: tInteraction(
          locale,
          "unverifiedKick:embed.field.value.exempt_count",
          { count: settings.exemptRoleIds.length },
        ),
        inline: true,
      },
      {
        name: tInteraction(locale, "unverifiedKick:embed.field.name.timezone"),
        value: settings.timezone,
        inline: true,
      },
      {
        name: tInteraction(locale, "unverifiedKick:embed.field.name.run_hour"),
        value: `${String(settings.runHour).padStart(2, "0")}:00`,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.mention_enabled",
        ),
        value: settings.mentionEnabled ? enabled : disabled,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "unverifiedKick:embed.field.name.test_mode_status",
        ),
        value: env.UNVERIFIED_KICK_DRY_RUN ? enabled : disabled,
        inline: true,
      },
    ],
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
