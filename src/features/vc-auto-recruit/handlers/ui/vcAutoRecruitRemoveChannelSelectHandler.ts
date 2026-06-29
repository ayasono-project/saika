// src/features/vc-auto-recruit/handlers/ui/vcAutoRecruitRemoveChannelSelectHandler.ts
// remove-channel セレクトメニューの選択応答（選択した VC チャンネルを募集対象から一括解除する）

import { type StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotVcAutoRecruitSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "../../commands/vcAutoRecruitSettingsCommand.constants";

export const vcAutoRecruitRemoveChannelSelectHandler: StringSelectHandler = {
  matches(customId) {
    return (
      customId === VC_AUTO_RECRUIT_SETTINGS_COMMAND.REMOVE_CHANNEL_SELECT_ID
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const removed =
      await getBotVcAutoRecruitSettingsService().removeEnabledChannels(
        guildId,
        interaction.values,
      );

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "vcAutoRecruit:user-response.channels_removed_count",
            {
              count: removed.length,
              channels: removed.map((id) => `<#${id}>`).join(" "),
            },
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:embed.title.success",
            ),
          },
        ),
      ],
      components: [],
    });

    for (const channelId of removed) {
      logger.info(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.config_channel_removed",
          { guildId, channelId },
        ),
      );
    }
  },
};
