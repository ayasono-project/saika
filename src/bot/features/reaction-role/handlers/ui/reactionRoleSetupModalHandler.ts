// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupModalHandler.ts
// setup フローのパネル設定モーダル送信ハンドラ

import {
  ActionRowBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
} from "discord.js";
import { REACTION_ROLE_MODE } from "../../../../../shared/database/types/reactionRoleTypes";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_PANEL_COLOR,
} from "../../commands/reactionRoleCommand.constants";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローのパネル設定モーダルを処理するハンドラ
 * モーダル送信後、モード選択 StringSelectMenu を表示する
 */
export const reactionRoleSetupModalHandler: ModalHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_PREFIX);
  },

  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_PREFIX.length,
    );
    const session = reactionRoleSetupSessions.get(sessionId);
    if (!session) {
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

    const title = interaction.fields.getTextInputValue(
      REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_TITLE,
    );
    const description = interaction.fields.getTextInputValue(
      REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_DESCRIPTION,
    );
    const colorInput = interaction.fields
      .getTextInputValue(REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_COLOR)
      .trim();
    const color = colorInput || REACTION_ROLE_DEFAULT_PANEL_COLOR;

    // カラーコードのバリデーション
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.invalid_color",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // セッションに保存
    session.title = title;
    session.description = description;
    session.color = color;

    // モード選択 StringSelectMenu を表示
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_MODE_PREFIX}${sessionId}`)
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.mode_placeholder",
        ),
      )
      .addOptions(
        {
          label: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_toggle",
          ),
          description: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_toggle_description",
          ),
          value: REACTION_ROLE_MODE.TOGGLE,
        },
        {
          label: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_one_action",
          ),
          description: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_one_action_description",
          ),
          value: REACTION_ROLE_MODE.ONE_ACTION,
        },
        {
          label: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_exclusive",
          ),
          description: tInteraction(
            interaction.locale,
            "reactionRole:ui.select.mode_exclusive_description",
          ),
          value: REACTION_ROLE_MODE.EXCLUSIVE,
        },
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    await interaction.reply({
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
