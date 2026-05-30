// src/features/inactive-kick/handlers/ui/inactiveKickWhitelistRemoveSelectHandler.ts
// whitelist remove セレクトメニューの選択応答（選択した項目を一括削除する）

import { type StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotInactiveKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../commands/inactiveKickSettingsCommand.constants";

export const inactiveKickWhitelistRemoveSelectHandler: StringSelectHandler = {
  matches(customId) {
    return (
      customId === INACTIVE_KICK_SETTINGS_COMMAND.WHITELIST_REMOVE_SELECT_ID
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    // 選択値は "role:<id>" / "user:<id>" 形式。種別ごとに振り分ける
    const roleIds: string[] = [];
    const userIds: string[] = [];
    for (const value of interaction.values) {
      const [kind, id] = value.split(":");
      if (kind === "role" && id) roleIds.push(id);
      else if (kind === "user" && id) userIds.push(id);
    }

    const removed =
      await getBotInactiveKickSettingsService().removeFromWhitelist(
        guildId,
        roleIds,
        userIds,
      );

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.whitelist_remove_count",
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
