// src/bot/features/guild-config/commands/guildConfigCommand.viewPages.ts
// guild-config view のギルド設定ページ Embed 生成（純粋関数）

import type { EmbedBuilder } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
import { createInfoEmbed } from "../../../utils/messageResponse";

/**
 * ギルド設定（locale + errorChannelId）の Embed を生成する
 * @param guildId 表示対象のギルドID
 * @param locale interaction.locale
 * @returns ギルド設定の Embed
 */
export async function buildGuildConfigPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config = await getBotGuildConfigService().getConfig(guildId);
  const notConfigured = tInteraction(
    locale,
    "common:embed.field.value.not_configured",
  );

  const localeLabel = config?.locale === "en" ? "English (en)" : "日本語 (ja)";
  const errorChannelValue = config?.errorChannelId
    ? `<#${config.errorChannelId}>`
    : notConfigured;

  return createInfoEmbed("", {
    title: tInteraction(locale, "guildConfig:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "guildConfig:embed.field.name.locale"),
        value: localeLabel,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "guildConfig:embed.field.name.error_channel",
        ),
        value: errorChannelValue,
        inline: true,
      },
    ],
  });
}
