// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupColorSelectHandler.ts
// setup フローの色選択 StringSelectMenu ハンドラ

import {
  ActionRowBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  isValidButtonStyle,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_BUTTON_STYLE,
  REACTION_ROLE_MAX_ROLE_SELECT,
} from "../../commands/reactionRoleCommand.constants";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローの色選択 SelectMenu を処理するハンドラ
 * 色選択後、RoleSelectMenu を表示する
 */
export const reactionRoleSetupColorSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_COLOR_PREFIX);
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.SETUP_COLOR_PREFIX.length,
    );
    const session = reactionRoleSetupSessions.get(sessionId);
    if (!session || !session.pendingButton) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selected = interaction.values[0] ?? "";
    session.pendingButton.style = isValidButtonStyle(selected)
      ? selected
      : REACTION_ROLE_DEFAULT_BUTTON_STYLE;

    // RoleSelectMenu を表示（同メッセージを update で置き換え）
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_ROLES_PREFIX}${sessionId}`)
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.roles_placeholder",
        ),
      )
      .setMinValues(1)
      .setMaxValues(REACTION_ROLE_MAX_ROLE_SELECT);

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      roleSelect,
    );

    await interaction.update({
      components: [row],
    });
  },
};
