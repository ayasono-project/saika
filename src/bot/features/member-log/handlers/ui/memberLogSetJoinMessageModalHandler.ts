// src/bot/features/member-log/handlers/ui/memberLogSetJoinMessageModalHandler.ts
// member-log-config set-join-message モーダル送信処理

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotMemberLogConfigService } from "../../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../utils/messageResponse";
import { MEMBER_LOG_CONFIG_COMMAND } from "../../commands/memberLogConfigCommand.constants";

export const memberLogSetJoinMessageModalHandler: ModalHandler = {
  matches(customId) {
    return customId === MEMBER_LOG_CONFIG_COMMAND.SET_JOIN_MESSAGE_MODAL_ID;
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const guildId = guild.id;

    const message = interaction.fields.getTextInputValue(
      MEMBER_LOG_CONFIG_COMMAND.MODAL_INPUT_MESSAGE,
    );

    await getBotMemberLogConfigService().setJoinMessage(guildId, message);

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
