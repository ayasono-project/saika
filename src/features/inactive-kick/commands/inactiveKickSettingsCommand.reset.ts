// src/features/inactive-kick/commands/inactiveKickSettingsCommand.reset.ts
// inactive-kick-settings reset 実行処理（確認ダイアログ付き）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS,
  INACTIVE_KICK_SETTINGS_COMMAND,
} from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

const LOG_PREFIX = "system:log_prefix.inactive_kick";

/**
 * 設定をリセットする（確認ダイアログ → 確定でデフォルトへ戻す）。
 */
export async function handleInactiveKickReset(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);
  const locale = interaction.locale;

  const confirmEmbed = createWarningEmbed(
    tInteraction(locale, "inactiveKick:embed.description.reset_confirm"),
    {
      title: tInteraction(locale, "inactiveKick:embed.title.reset_confirm"),
      fields: [
        {
          name: tInteraction(
            locale,
            "inactiveKick:embed.field.name.reset_target",
          ),
          value: tInteraction(
            locale,
            "inactiveKick:embed.field.value.reset_target",
          ),
        },
      ],
    },
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(INACTIVE_KICK_SETTINGS_COMMAND.RESET_CONFIRM_ID)
      .setEmoji("🗑️")
      .setLabel(tInteraction(locale, "common:ui.button.reset_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(INACTIVE_KICK_SETTINGS_COMMAND.RESET_CANCEL_ID)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "common:ui.button.reset_cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (i.customId === INACTIVE_KICK_SETTINGS_COMMAND.RESET_CONFIRM_ID) {
      await getBotInactiveKickSettingsService().reset(guildId);
      await i.update({
        embeds: [
          createSuccessEmbed(
            tInteraction(locale, "inactiveKick:user-response.reset_success"),
            { title: tInteraction(locale, "common:embed.title.success") },
          ),
        ],
        components: [],
      });
      logger.info(
        logPrefixed(LOG_PREFIX, "inactiveKick:log.config_updated", {
          guildId,
          action: "reset",
        }),
      );
    } else if (i.customId === INACTIVE_KICK_SETTINGS_COMMAND.RESET_CANCEL_ID) {
      await i.update({
        embeds: [
          createSuccessEmbed(
            tInteraction(locale, "inactiveKick:user-response.reset_cancelled"),
            { title: tInteraction(locale, "common:embed.title.success") },
          ),
        ],
        components: [],
      });
    }
    collector.stop();
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction
        .editReply({
          embeds: [
            createSuccessEmbed(
              tInteraction(
                locale,
                "inactiveKick:user-response.reset_cancelled",
              ),
              { title: tInteraction(locale, "common:embed.title.success") },
            ),
          ],
          components: [],
        })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
