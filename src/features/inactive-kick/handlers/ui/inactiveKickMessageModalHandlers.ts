// src/features/inactive-kick/handlers/ui/inactiveKickMessageModalHandlers.ts
// inactive-kick-settings の warn / kick メッセージ設定モーダル送信処理

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotInactiveKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../commands/inactiveKickSettingsCommand.constants";

/** 事前通知メッセージ（1週間前）設定モーダル */
export const inactiveKickSetWeekWarnMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId === INACTIVE_KICK_SETTINGS_COMMAND.SET_WEEK_WARN_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      INACTIVE_KICK_SETTINGS_COMMAND.WEEK_WARN_MESSAGE_MODAL_INPUT,
    );
    await getBotInactiveKickSettingsService().setWeekWarnMessage(
      guild.id,
      message,
    );

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.set_week_warn_message_success",
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

/** 事前通知メッセージ（最終警告）設定モーダル */
export const inactiveKickSetFinalWarnMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId ===
      INACTIVE_KICK_SETTINGS_COMMAND.SET_FINAL_WARN_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      INACTIVE_KICK_SETTINGS_COMMAND.FINAL_WARN_MESSAGE_MODAL_INPUT,
    );
    await getBotInactiveKickSettingsService().setFinalWarnMessage(
      guild.id,
      message,
    );

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.set_final_warn_message_success",
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
