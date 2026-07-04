// src/features/inactive-kick/handlers/ui/inactiveKickTierRemoveSelectHandler.ts
// tier remove セレクトメニューの選択応答（選択した階層を一括削除する）

import { type StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotInactiveKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../commands/inactiveKickSettingsCommand.constants";

export const inactiveKickTierRemoveSelectHandler: StringSelectHandler = {
  matches(customId) {
    return customId === INACTIVE_KICK_SETTINGS_COMMAND.TIER_REMOVE_SELECT_ID;
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    // 選択値は tenureDays の文字列表現
    const tenureDaysList = interaction.values
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));

    const removed = await getBotInactiveKickSettingsService().removeTiers(
      guildId,
      tenureDaysList,
    );

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.tier_remove_count",
            { count: removed },
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:embed.title.success",
            ),
          },
        ),
      ],
      // 選択後はメニューを片付ける
      components: [],
    });
  },
};
