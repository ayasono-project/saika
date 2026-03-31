// src/bot/features/reaction-role/handlers/ui/reactionRoleEditPanelHandler.ts
// edit-panel フローのセレクトメニュー・モーダルハンドラ

import {
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type {
  ModalHandler,
  StringSelectHandler,
} from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_PANEL_COLOR,
} from "../../commands/reactionRoleCommand.constants";
import { buildEditPanelModal } from "../../commands/usecases/reactionRoleConfigEditPanel";
import { updatePanelMessage } from "../../services/reactionRolePanelBuilder";
import { reactionRoleEditPanelSessions } from "./reactionRoleSetupState";

/**
 * edit-panel フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleEditPanelSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_SELECT_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_SELECT_PREFIX.length,
    );
    const session = reactionRoleEditPanelSessions.get(sessionId);
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

    const panelId = interaction.values[0];
    session.panelId = panelId;

    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(panelId);
    if (!panel) return;

    const modal = buildEditPanelModal(
      sessionId,
      panel.title,
      panel.description,
      panel.color,
      interaction.locale,
    );
    await interaction.showModal(modal);
  },
};

/**
 * edit-panel フローのモーダル送信ハンドラ
 */
export const reactionRoleEditPanelModalHandler: ModalHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX);
  },

  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX.length,
    );
    const session = reactionRoleEditPanelSessions.get(sessionId);
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
      REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_TITLE,
    );
    const description = interaction.fields.getTextInputValue(
      REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_DESCRIPTION,
    );
    const colorInput = interaction.fields
      .getTextInputValue(REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_COLOR)
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // セレクトメニューメッセージを削除
    await session.commandInteraction?.deleteReply().catch(() => null);

    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    if (!panel) return;

    // DB更新
    await configService.update(session.panelId, {
      title,
      description,
      color,
    });

    // パネルメッセージを更新
    const buttons = parseButtons(panel.buttons);
    const updated = await updatePanelMessage(
      interaction.client,
      panel.channelId,
      panel.messageId,
      panel.id,
      title,
      description,
      color,
      buttons,
    );

    if (!updated) {
      // パネルメッセージが削除済み → DB クリーンアップ
      await configService.delete(session.panelId);
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.panel_message_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.editReply({ embeds: [embed] });
      reactionRoleEditPanelSessions.delete(sessionId);
      return;
    }

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.edit_panel_success",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });

    reactionRoleEditPanelSessions.delete(sessionId);
  },
};
