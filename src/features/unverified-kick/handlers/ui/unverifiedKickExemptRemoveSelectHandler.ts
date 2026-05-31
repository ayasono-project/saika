// src/features/unverified-kick/handlers/ui/unverifiedKickExemptRemoveSelectHandler.ts
// exempt remove セレクトメニューの選択応答（選択したロールを一括削除する）

import { type StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotUnverifiedKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "../../commands/unverifiedKickSettingsCommand.constants";

export const unverifiedKickExemptRemoveSelectHandler: StringSelectHandler = {
  matches(customId) {
    return (
      customId === UNVERIFIED_KICK_SETTINGS_COMMAND.EXEMPT_REMOVE_SELECT_ID
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    // 選択値はロール ID。まとめて削除する
    const removed =
      await getBotUnverifiedKickSettingsService().removeExemptRoles(
        guildId,
        interaction.values,
      );

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "unverifiedKick:user-response.exempt_remove_count",
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
