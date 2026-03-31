// src/bot/features/guild-config/commands/guildConfigCommand.resetAll.ts
// guild-config reset-all サブコマンド実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  localeManager,
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../utils/messageResponse";
import {
  CONFIRM_TIMEOUT_MS,
  GUILD_CONFIG_CUSTOM_ID,
} from "../constants/guildConfig.constants";

/**
 * 全機能の設定を一括リセットする
 * 確認ダイアログを表示し、確認後に全設定を削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定対象のギルドID
 */
export async function handleResetAll(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;

  // 確認ダイアログを表示
  const confirmEmbed = createWarningEmbed(
    tInteraction(locale, "guildConfig:embed.description.reset_all_confirm"),
    {
      title: tInteraction(locale, "guildConfig:embed.title.reset_all_confirm"),
      fields: [
        {
          name: tInteraction(
            locale,
            "guildConfig:embed.field.name.reset_all_target",
          ),
          value: tInteraction(
            locale,
            "guildConfig:embed.field.value.reset_all_target",
          ),
        },
      ],
    },
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.RESET_ALL_CONFIRM)
      .setEmoji("🗑️")
      .setLabel(tInteraction(locale, "guildConfig:ui.button.reset_all_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.RESET_ALL_CANCEL)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "guildConfig:ui.button.reset_all_cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // ボタン応答を待機
  const collector = response.createMessageComponentCollector({
    time: CONFIRM_TIMEOUT_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (i.customId === GUILD_CONFIG_CUSTOM_ID.RESET_ALL_CONFIRM) {
      // 全設定削除
      await getBotGuildConfigService().deleteAllConfig(guildId);

      // キャッシュを即時無効化
      localeManager.invalidateLocaleCache(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.reset_all_success"),
      );
      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.guild_config",
          "guildConfig:log.reset_all",
          { guildId },
        ),
      );
    } else if (i.customId === GUILD_CONFIG_CUSTOM_ID.RESET_ALL_CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.reset_all_cancelled"),
      );
      await i.update({ embeds: [cancelEmbed], components: [] });
    }

    collector.stop();
  });
  /* istanbul ignore stop */

  // タイムアウト時はキャンセル扱い
  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.reset_all_cancelled"),
      );
      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
