// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.schedule.ts
// unverified-kick-settings の スケジュール系サブコマンド（set-timezone / set-run-hour / mention enable|disable）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS,
  UNVERIFIED_KICK_SETTINGS_COMMAND,
} from "./unverifiedKickSettingsCommand.constants";

const LOG_PREFIX = "system:log_prefix.unverified_kick";

/** 主要 IANA タイムゾーン一覧（最大 25 件） */
const TIMEZONE_OPTIONS: { label: string; value: string }[] = [
  { label: "Pacific/Honolulu (UTC-10)", value: "Pacific/Honolulu" },
  { label: "America/Anchorage (UTC-9)", value: "America/Anchorage" },
  { label: "America/Los_Angeles (UTC-8)", value: "America/Los_Angeles" },
  { label: "America/Denver (UTC-7)", value: "America/Denver" },
  { label: "America/Chicago (UTC-6)", value: "America/Chicago" },
  { label: "America/New_York (UTC-5)", value: "America/New_York" },
  { label: "America/Halifax (UTC-4)", value: "America/Halifax" },
  { label: "America/Sao_Paulo (UTC-3)", value: "America/Sao_Paulo" },
  { label: "Atlantic/Azores (UTC-1)", value: "Atlantic/Azores" },
  { label: "UTC (UTC+0)", value: "UTC" },
  { label: "Europe/London (UTC+0/+1)", value: "Europe/London" },
  { label: "Europe/Paris (UTC+1/+2)", value: "Europe/Paris" },
  { label: "Europe/Athens (UTC+2/+3)", value: "Europe/Athens" },
  { label: "Europe/Moscow (UTC+3)", value: "Europe/Moscow" },
  { label: "Asia/Dubai (UTC+4)", value: "Asia/Dubai" },
  { label: "Asia/Karachi (UTC+5)", value: "Asia/Karachi" },
  { label: "Asia/Kolkata (UTC+5:30)", value: "Asia/Kolkata" },
  { label: "Asia/Dhaka (UTC+6)", value: "Asia/Dhaka" },
  { label: "Asia/Bangkok (UTC+7)", value: "Asia/Bangkok" },
  { label: "Asia/Shanghai (UTC+8)", value: "Asia/Shanghai" },
  { label: "Asia/Tokyo (UTC+9)", value: "Asia/Tokyo" },
  { label: "Asia/Seoul (UTC+9)", value: "Asia/Seoul" },
  { label: "Australia/Sydney (UTC+10/+11)", value: "Australia/Sydney" },
  { label: "Pacific/Fiji (UTC+12)", value: "Pacific/Fiji" },
  { label: "Pacific/Auckland (UTC+12/+13)", value: "Pacific/Auckland" },
];

/**
 * タイムゾーンを設定する（セレクトメニュー付きインラインコレクター）。
 */
export async function handleUnverifiedKickSetTimezone(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  ensureManageGuildPermission(interaction);
  const locale = interaction.locale;

  const select = new StringSelectMenuBuilder()
    .setCustomId(UNVERIFIED_KICK_SETTINGS_COMMAND.SET_TIMEZONE_SELECT_ID)
    .setPlaceholder(
      tInteraction(locale, "unverifiedKick:ui.select.set_timezone_placeholder"),
    )
    .addOptions(
      TIMEZONE_OPTIONS.map((tz) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(tz.label)
          .setValue(tz.value),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    select,
  );

  const response = await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (!i.isStringSelectMenu()) return;
    const timezone = i.values[0];
    if (!timezone) return;
    await getBotUnverifiedKickSettingsService().setTimezone(guildId, timezone);
    await i.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            locale,
            "unverifiedKick:user-response.set_timezone_success",
            { timezone },
          ),
          { title: tInteraction(locale, "common:embed.title.success") },
        ),
      ],
      components: [],
    });
    logger.info(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.config_updated", {
        guildId,
        action: "set-timezone",
      }),
    );
    collector.stop();
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction.editReply({ components: [] }).catch(() => {});
    }
  });
  /* istanbul ignore stop */
}

/**
 * 実行時刻（0〜23 時）を設定する（セレクトメニュー付きインラインコレクター）。
 */
export async function handleUnverifiedKickSetRunHour(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  ensureManageGuildPermission(interaction);
  const locale = interaction.locale;

  const select = new StringSelectMenuBuilder()
    .setCustomId(UNVERIFIED_KICK_SETTINGS_COMMAND.SET_RUN_HOUR_SELECT_ID)
    .setPlaceholder(
      tInteraction(locale, "unverifiedKick:ui.select.set_run_hour_placeholder"),
    )
    .addOptions(
      Array.from({ length: 24 }, (_, h) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${String(h).padStart(2, "0")}:00`)
          .setValue(String(h)),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    select,
  );

  const response = await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (!i.isStringSelectMenu()) return;
    const rawHour = i.values[0];
    if (rawHour === undefined) return;
    const runHour = parseInt(rawHour, 10);
    await getBotUnverifiedKickSettingsService().setRunHour(guildId, runHour);
    await i.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            locale,
            "unverifiedKick:user-response.set_run_hour_success",
            { hour: String(runHour).padStart(2, "0") },
          ),
          { title: tInteraction(locale, "common:embed.title.success") },
        ),
      ],
      components: [],
    });
    logger.info(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.config_updated", {
        guildId,
        action: "set-run-hour",
      }),
    );
    collector.stop();
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction.editReply({ components: [] }).catch(() => {});
    }
  });
  /* istanbul ignore stop */
}

/**
 * 個別メンション通知を有効化する。
 */
export async function handleUnverifiedKickMentionEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  ensureManageGuildPermission(interaction);
  const locale = interaction.locale;

  await getBotUnverifiedKickSettingsService().setMentionEnabled(guildId, true);
  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        tInteraction(locale, "unverifiedKick:user-response.mention_enabled"),
        { title: tInteraction(locale, "common:embed.title.success") },
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.config_updated", {
      guildId,
      action: "mention-enable",
    }),
  );
}

/**
 * 個別メンション通知を無効化する。
 */
export async function handleUnverifiedKickMentionDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  ensureManageGuildPermission(interaction);
  const locale = interaction.locale;

  await getBotUnverifiedKickSettingsService().setMentionEnabled(guildId, false);
  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        tInteraction(locale, "unverifiedKick:user-response.mention_disabled"),
        { title: tInteraction(locale, "common:embed.title.success") },
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
  logger.info(
    logPrefixed(LOG_PREFIX, "unverifiedKick:log.config_updated", {
      guildId,
      action: "mention-disable",
    }),
  );
}
