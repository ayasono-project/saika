// src/bot/features/help/commands/helpCommand.execute.ts
// help コマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { env } from "../../../../shared/config/env";
import { EMBED_COLORS } from "../../../../shared/constants/embedColors";
import { tInteraction } from "../../../../shared/locale/localeManager";

const HELP_I18N_KEYS = {
  EMBED_TITLE: "help:embed.title.help",
  EMBED_DESCRIPTION: "help:embed.description.help",
  FIELD_NAME_BASIC: "help:embed.field.name.basic",
  FIELD_NAME_CONFIG: "help:embed.field.name.config",
  FIELD_NAME_ACTION: "help:embed.field.name.action",
  FIELD_VALUE_BASIC: "help:embed.field.value.basic",
  FIELD_VALUE_CONFIG: "help:embed.field.value.config",
  FIELD_VALUE_ACTION: "help:embed.field.value.action",
} as const;

/**
 * help コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeHelpCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const locale = interaction.locale;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.HELP)
    .setTitle(tInteraction(locale, HELP_I18N_KEYS.EMBED_TITLE))
    .addFields(
      {
        name: tInteraction(locale, HELP_I18N_KEYS.FIELD_NAME_BASIC),
        value: tInteraction(locale, HELP_I18N_KEYS.FIELD_VALUE_BASIC),
      },
      {
        name: tInteraction(locale, HELP_I18N_KEYS.FIELD_NAME_CONFIG),
        value: tInteraction(locale, HELP_I18N_KEYS.FIELD_VALUE_CONFIG),
      },
      {
        name: tInteraction(locale, HELP_I18N_KEYS.FIELD_NAME_ACTION),
        value: tInteraction(locale, HELP_I18N_KEYS.FIELD_VALUE_ACTION),
      },
    );

  if (env.USER_MANUAL_URL) {
    embed.setDescription(
      tInteraction(locale, HELP_I18N_KEYS.EMBED_DESCRIPTION, {
        url: env.USER_MANUAL_URL,
      }),
    );
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
