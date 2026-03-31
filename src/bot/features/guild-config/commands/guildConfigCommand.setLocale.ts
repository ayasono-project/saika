// src/bot/features/guild-config/commands/guildConfigCommand.setLocale.ts
// guild-config set-locale サブコマンド実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  localeManager,
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";

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
  await getBotGuildConfigService().updateLocale(guildId, locale);

  // キャッシュを即時無効化
  localeManager.invalidateLocaleCache(guildId);

  const localeLabel = locale === "ja" ? "日本語 (ja)" : "English (en)";
  const description = tInteraction(
    interaction.locale,
    "guildConfig:user-response.set_locale_success",
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
      "guildConfig:log.locale_set",
      {
        guildId,
        locale,
      },
    ),
  );
}
