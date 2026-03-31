// src/bot/features/reaction-role/handlers/ui/reactionRoleEditButtonHandler.ts
// edit-button フローのハンドラ群

import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  type ModalSubmitInteraction,
  RoleSelectMenuBuilder,
  type RoleSelectMenuInteraction,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type {
  ModalHandler,
  RoleSelectHandler,
  StringSelectHandler,
} from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  isValidButtonStyle,
  isValidEmoji,
  normalizeEmoji,
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_BUTTON_STYLE,
  REACTION_ROLE_MAX_ROLE_SELECT,
} from "../../commands/reactionRoleCommand.constants";
import { updatePanelMessage } from "../../services/reactionRolePanelBuilder";
import { reactionRoleEditButtonSessions } from "./reactionRoleSetupState";

/**
 * edit-button フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleEditButtonPanelSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_PANEL_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_PANEL_PREFIX.length,
    );
    const session = reactionRoleEditButtonSessions.get(sessionId);
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

    const buttons = parseButtons(panel.buttons);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_SELECT_PREFIX}${sessionId}`,
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.button_placeholder",
        ),
      )
      .addOptions(
        buttons.map((btn) => ({
          label: btn.label,
          description: btn.emoji || undefined,
          value: String(btn.buttonId),
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    await interaction.update({
      components: [row],
    });
  },
};

/**
 * edit-button フローのボタン選択セレクトメニューハンドラ
 */
export const reactionRoleEditButtonSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_SELECT_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_SELECT_PREFIX.length,
    );
    const session = reactionRoleEditButtonSessions.get(sessionId);
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

    const buttonId = Number(interaction.values[0]);
    session.buttonId = buttonId;

    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    if (!panel) return;

    const buttons = parseButtons(panel.buttons);
    const targetButton = buttons.find((b) => b.buttonId === buttonId);
    if (!targetButton) return;

    // ボタン設定モーダルを表示（現在値をプリフィル）
    const modal = new ModalBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_MODAL_PREFIX}${sessionId}`,
      )
      .setTitle(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.modal.button_settings_title",
        ),
      )
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_LABEL)
            .setLabel(
              tInteraction(
                interaction.locale,
                "reactionRole:ui.modal.button_field_label",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setValue(targetButton.label),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_EMOJI)
            .setLabel(
              tInteraction(
                interaction.locale,
                "reactionRole:ui.modal.button_field_emoji",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(targetButton.emoji),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_STYLE)
            .setLabel(
              tInteraction(
                interaction.locale,
                "reactionRole:ui.modal.button_field_style",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(targetButton.style),
        ),
      );

    await interaction.showModal(modal);
  },
};

/**
 * edit-button フローのモーダル送信ハンドラ
 */
export const reactionRoleEditButtonModalHandler: ModalHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_MODAL_PREFIX,
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_MODAL_PREFIX.length,
    );
    const session = reactionRoleEditButtonSessions.get(sessionId);
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

    const label = interaction.fields.getTextInputValue(
      REACTION_ROLE_CUSTOM_ID.BUTTON_LABEL,
    );
    const emoji = normalizeEmoji(
      interaction.fields
        .getTextInputValue(REACTION_ROLE_CUSTOM_ID.BUTTON_EMOJI)
        .trim(),
    );
    const styleInput = interaction.fields
      .getTextInputValue(REACTION_ROLE_CUSTOM_ID.BUTTON_STYLE)
      .trim()
      .toLowerCase();
    const style = styleInput || REACTION_ROLE_DEFAULT_BUTTON_STYLE;

    if (!isValidEmoji(emoji)) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.invalid_emoji",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isValidButtonStyle(style)) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.invalid_style",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    session.pendingButton = { label, emoji, style };

    // RoleSelectMenu を表示
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_ROLES_PREFIX}${sessionId}`,
      )
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

    await interaction.reply({
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

/**
 * edit-button フローのロール選択ハンドラ（最終ステップ）
 */
export const reactionRoleEditButtonRoleSelectHandler: RoleSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_ROLES_PREFIX,
    );
  },

  async execute(interaction: RoleSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.EDIT_BUTTON_ROLES_PREFIX.length,
    );
    const session = reactionRoleEditButtonSessions.get(sessionId);
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

    await interaction.deferUpdate();

    const roleIds = Array.from(interaction.roles.keys());
    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    if (!panel) return;

    const allButtons = parseButtons(panel.buttons);
    const targetIndex = allButtons.findIndex(
      (b) => b.buttonId === session.buttonId,
    );
    if (targetIndex === -1) return;

    // ボタン情報を更新
    allButtons[targetIndex] = {
      ...allButtons[targetIndex],
      label: session.pendingButton.label,
      emoji: session.pendingButton.emoji,
      style: session.pendingButton.style,
      roleIds,
    };

    // DB更新
    await configService.update(session.panelId, {
      buttons: JSON.stringify(allButtons),
    });

    // パネルメッセージを更新
    const updated = await updatePanelMessage(
      interaction.client,
      panel.channelId,
      panel.messageId,
      panel.id,
      panel.title,
      panel.description,
      panel.color,
      allButtons,
    );

    if (!updated) {
      // パネルメッセージが削除済み → DB クリーンアップ
      await configService.delete(session.panelId);
      await interaction.deleteReply().catch(() => null);
      await session.commandInteraction?.deleteReply().catch(() => null);
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.panel_message_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      reactionRoleEditButtonSessions.delete(sessionId);
      return;
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.button_edited",
        {
          guildId: interaction.guildId ?? "",
          panelId: session.panelId,
          buttonId: String(session.buttonId),
        },
      ),
    );

    // フローメッセージを削除
    await interaction.deleteReply().catch(() => null);
    // セレクトメニューメッセージを削除
    await session.commandInteraction?.deleteReply().catch(() => null);

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.edit_button_success",
      ),
      { locale: interaction.locale },
    );
    await interaction.followUp({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    reactionRoleEditButtonSessions.delete(sessionId);
  },
};
