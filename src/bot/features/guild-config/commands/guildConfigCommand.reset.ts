// src/bot/features/guild-config/commands/guildConfigCommand.reset.ts
// guild-config reset サブコマンド実行処理

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
 * ギルド設定（言語・エラー通知チャンネル）をリセットする
 * 確認ダイアログを表示し、確認後にデフォルト状態に戻す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定対象のギルドID
 */
export async function handleReset(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;

  // 確認ダイアログを表示
  const confirmEmbed = createWarningEmbed(
    tInteraction(locale, "guildConfig:embed.description.reset_confirm"),
    {
      title: tInteraction(locale, "guildConfig:embed.title.reset_confirm"),
    },
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.RESET_CONFIRM)
      .setEmoji("🗑️")
      .setLabel(tInteraction(locale, "common:ui.button.reset_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.RESET_CANCEL)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "common:ui.button.reset_cancel"))
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
    if (i.customId === GUILD_CONFIG_CUSTOM_ID.RESET_CONFIRM) {
      // リセット実行
      await getBotGuildConfigService().resetGuildSettings(guildId);

      // キャッシュを即時無効化
      localeManager.invalidateLocaleCache(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.reset_success"),
      );
      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed("system:log_prefix.guild_config", "guildConfig:log.reset", {
          guildId,
        }),
      );
    } else if (i.customId === GUILD_CONFIG_CUSTOM_ID.RESET_CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.reset_cancelled"),
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
        tInteraction(locale, "guildConfig:user-response.reset_cancelled"),
      );
      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
