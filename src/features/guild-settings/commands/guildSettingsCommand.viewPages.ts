// src/bot/features/guild-settings/commands/guildSettingsCommand.viewPages.ts
// guild-settings view のギルド設定ページ Embed 生成（純粋関数）

import type { EmbedBuilder } from "discord.js";
import { getBotGuildSettingsService } from "../../../bot/services/botCompositionRoot";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";

/**
 * ギルド設定（locale + errorChannelId）の Embed を生成する
 * @param guildId 表示対象のギルドID
 * @param locale interaction.locale
 * @returns ギルド設定の Embed
 */
export async function buildGuildSettingsPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config = await getBotGuildSettingsService().getSettings(guildId);
  const notConfigured = tInteraction(
    locale,
    "common:embed.field.value.not_configured",
  );

  const localeLabel = config?.locale === "en" ? "English (en)" : "日本語 (ja)";
  const errorChannelValue = config?.errorChannelId
    ? `<#${config.errorChannelId}>`
    : notConfigured;

  return createInfoEmbed("", {
    title: tInteraction(locale, "guildSettings:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "guildSettings:embed.field.name.locale"),
        value: localeLabel,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "guildSettings:embed.field.name.error_channel",
        ),
        value: errorChannelValue,
        inline: true,
      },
    ],
  });
}
