// src/bot/features/member-log/handlers/ui/memberLogSetJoinMessageModalHandler.ts
// member-log-settings set-join-message モーダル送信処理

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotMemberLogSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { MEMBER_LOG_SETTINGS_COMMAND } from "../../commands/memberLogSettingsCommand.constants";

export const memberLogSetJoinMessageModalHandler: ModalHandler = {
  matches(customId) {
    return customId === MEMBER_LOG_SETTINGS_COMMAND.SET_JOIN_MESSAGE_MODAL_ID;
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const guildId = guild.id;

    const message = interaction.fields.getTextInputValue(
      MEMBER_LOG_SETTINGS_COMMAND.MODAL_INPUT_MESSAGE,
    );

    await getBotMemberLogSettingsService().setJoinMessage(guildId, message);

    const description = tInteraction(
      interaction.locale,
      "memberLog:user-response.set_join_message_success",
    );
    const successTitle = tInteraction(
      interaction.locale,
      "common:embed.title.success",
    );
    await interaction.reply({
      embeds: [createSuccessEmbed(description, { title: successTitle })],
      flags: MessageFlags.Ephemeral,
    });

    logger.info(
      logPrefixed(
        "system:log_prefix.member_log",
        "memberLog:log.config_join_message_set",
        { guildId },
      ),
    );
  },
};
