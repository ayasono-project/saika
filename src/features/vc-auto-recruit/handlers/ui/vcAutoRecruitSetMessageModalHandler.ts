// src/features/vc-auto-recruit/handlers/ui/vcAutoRecruitSetMessageModalHandler.ts
// vc-auto-recruit-settings set-message モーダル送信処理

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotVcAutoRecruitSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "../../commands/vcAutoRecruitSettingsCommand.constants";

export const vcAutoRecruitSetMessageModalHandler: ModalHandler = {
  matches(customId) {
    return customId === VC_AUTO_RECRUIT_SETTINGS_COMMAND.SET_MESSAGE_MODAL_ID;
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const guildId = guild.id;

    const message = interaction.fields.getTextInputValue(
      VC_AUTO_RECRUIT_SETTINGS_COMMAND.MODAL_INPUT_MESSAGE,
    );

    await getBotVcAutoRecruitSettingsService().setMessage(guildId, message);

    const description = tInteraction(
      interaction.locale,
      "vcAutoRecruit:user-response.set_message_success",
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
        "system:log_prefix.vc_auto_recruit",
        "vcAutoRecruit:log.config_message_set",
        { guildId },
      ),
    );
  },
};
