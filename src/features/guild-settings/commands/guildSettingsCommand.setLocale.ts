// src/bot/features/guild-settings/commands/guildSettingsCommand.setLocale.ts
// guild-settings set-locale サブコマンド実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotGuildSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  localeManager,
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * ギルドの応答言語を設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定対象のギルドID
 */
export async function handleSetLocale(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.options.getString("locale", true);

  // DB更新
  await getBotGuildSettingsService().updateLocale(guildId, locale);

  // キャッシュを即時無効化
  localeManager.invalidateLocaleCache(guildId);

  const localeLabel = locale === "ja" ? "日本語 (ja)" : "English (en)";
  const description = tInteraction(
    interaction.locale,
    "guildSettings:user-response.set_locale_success",
    { locale: localeLabel },
  );
  const embed = createSuccessEmbed(description);

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed(
      "system:log_prefix.guild_config",
      "guildSettings:log.locale_set",
      {
        guildId,
        locale,
      },
    ),
  );
}
