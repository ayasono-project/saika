// src/features/vc-auto-recruit/handlers/ui/vcAutoRecruitRemoveCategorySelectHandler.ts
// remove-category セレクトメニューの選択応答（選択したカテゴリを募集対象から一括解除する）

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

export const vcAutoRecruitRemoveCategorySelectHandler: StringSelectHandler = {
  matches(customId) {
    return (
      customId === VC_AUTO_RECRUIT_SETTINGS_COMMAND.REMOVE_CATEGORY_SELECT_ID
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    // 選択値（カテゴリ ID または sentinel "TOP"）を一括解除する
    const removed =
      await getBotVcAutoRecruitSettingsService().removeEnabledCategories(
        guildId,
        interaction.values,
      );

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "vcAutoRecruit:user-response.categories_removed_count",
            { count: removed.length },
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

    // 監査用ログ（解除できたカテゴリごとに記録）
    for (const categoryId of removed) {
      logger.info(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.config_category_removed",
          { guildId, categoryId },
        ),
      );
    }
  },
};
