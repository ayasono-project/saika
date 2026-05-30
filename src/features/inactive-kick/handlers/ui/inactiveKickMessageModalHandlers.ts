// src/features/inactive-kick/handlers/ui/inactiveKickMessageModalHandlers.ts
// inactive-kick-settings の warn / kick メッセージ設定モーダル送信処理

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotInactiveKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../commands/inactiveKickSettingsCommand.constants";

/** 事前通知メッセージ設定モーダル */
export const inactiveKickSetWarnMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId === INACTIVE_KICK_SETTINGS_COMMAND.SET_WARN_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      INACTIVE_KICK_SETTINGS_COMMAND.WARN_MESSAGE_MODAL_INPUT,
    );
    await getBotInactiveKickSettingsService().setWarnMessage(guild.id, message);

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.set_warn_message_success",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:embed.title.success",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

/** キック通知メッセージ設定モーダル */
export const inactiveKickSetKickMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId === INACTIVE_KICK_SETTINGS_COMMAND.SET_KICK_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      INACTIVE_KICK_SETTINGS_COMMAND.KICK_MESSAGE_MODAL_INPUT,
    );
    await getBotInactiveKickSettingsService().setKickMessage(guild.id, message);

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.set_kick_message_success",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:embed.title.success",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
