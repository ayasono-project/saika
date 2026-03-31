// src/bot/features/reaction-role/handlers/ui/reactionRoleRemoveButtonHandler.ts
// remove-button フローのハンドラ群

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type {
  ButtonHandler,
  StringSelectHandler,
} from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
} from "../../commands/reactionRoleCommand.constants";
import { updatePanelMessage } from "../../services/reactionRolePanelBuilder";
import { reactionRoleRemoveButtonSessions } from "./reactionRoleSetupState";

/**
 * remove-button フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleRemoveButtonPanelSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_PANEL_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_PANEL_PREFIX.length,
    );
    const session = reactionRoleRemoveButtonSessions.get(sessionId);
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
        `${REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_SELECT_PREFIX}${sessionId}`,
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.button_placeholder",
        ),
      )
      .setMinValues(1)
      .setMaxValues(buttons.length)
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
 * remove-button フローのボタン選択セレクトメニューハンドラ
 */
export const reactionRoleRemoveButtonSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_SELECT_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_SELECT_PREFIX.length,
    );
    const session = reactionRoleRemoveButtonSessions.get(sessionId);
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

    const selectedButtonIds = interaction.values.map(Number);

    // 全ボタン削除チェック
    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    if (!panel) return;

    const allButtons = parseButtons(panel.buttons);
    if (selectedButtonIds.length >= allButtons.length) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.cannot_remove_all_buttons",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    session.buttonIds = selectedButtonIds;

    // 確認表示
    const targetLabels = allButtons
      .filter((b) => selectedButtonIds.includes(b.buttonId))
      .map((b) => `「${b.label}」`)
      .join("、");

    const count = selectedButtonIds.length;
    const embed = createWarningEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:embed.description.remove_button_confirm",
        { count },
      ),
      {
        title: tInteraction(
          interaction.locale,
          "reactionRole:embed.title.remove_button_confirm",
        ),
        locale: interaction.locale,
        fields: [
          {
            name: tInteraction(
              interaction.locale,
              "reactionRole:embed.field.name.remove_targets",
            ),
            value: targetLabels,
          },
        ],
      },
    );

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CONFIRM_PREFIX}${sessionId}`,
        )
        .setEmoji("🗑️")
        .setLabel(
          tInteraction(
            interaction.locale,
            "reactionRole:ui.button.remove_button_confirm",
          ),
        )
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CANCEL_PREFIX}${sessionId}`,
        )
        .setEmoji("❌")
        .setLabel(
          tInteraction(
            interaction.locale,
            "reactionRole:ui.button.remove_button_cancel",
          ),
        )
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({
      embeds: [embed],
      components: [confirmRow],
    });
  },
};

/**
 * remove-button フローの確認・キャンセルボタンハンドラ
 */
export const reactionRoleRemoveButtonButtonHandler: ButtonHandler = {
  matches(customId: string) {
    return (
      customId.startsWith(
        REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CONFIRM_PREFIX,
      ) ||
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CANCEL_PREFIX)
    );
  },

  async execute(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(
        REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CANCEL_PREFIX,
      )
    ) {
      const sessionId = interaction.customId.slice(
        REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CANCEL_PREFIX.length,
      );
      reactionRoleRemoveButtonSessions.delete(sessionId);

      const embed = createInfoEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.remove_button_cancelled",
        ),
        { locale: interaction.locale },
      );
      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_CONFIRM_PREFIX.length,
    );
    const session = reactionRoleRemoveButtonSessions.get(sessionId);
    if (!session) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();

    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    if (!panel) return;

    const allButtons = parseButtons(panel.buttons);
    const remainingButtons = allButtons.filter(
      (b) => !session.buttonIds.includes(b.buttonId),
    );

    // DB更新
    await configService.update(session.panelId, {
      buttons: JSON.stringify(remainingButtons),
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
      remainingButtons,
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
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      reactionRoleRemoveButtonSessions.delete(sessionId);
      return;
    }

    const count = session.buttonIds.length;

    for (const buttonId of session.buttonIds) {
      logger.info(
        logPrefixed(
          "system:log_prefix.reaction_role",
          "reactionRole:log.button_removed",
          {
            guildId: interaction.guildId ?? "",
            panelId: session.panelId,
            buttonId: String(buttonId),
          },
        ),
      );
    }

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.remove_button_success",
        { count },
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({
      embeds: [embed],
      components: [],
    });

    reactionRoleRemoveButtonSessions.delete(sessionId);
  },
};
