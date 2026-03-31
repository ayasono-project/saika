// src/bot/features/reaction-role/handlers/ui/reactionRoleAddButtonHandler.ts
// add-button フローのハンドラ群

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  type ModalSubmitInteraction,
  RoleSelectMenuBuilder,
  type RoleSelectMenuInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type {
  ButtonHandler,
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
  REACTION_ROLE_MAX_BUTTONS,
  REACTION_ROLE_MAX_ROLE_SELECT,
} from "../../commands/reactionRoleCommand.constants";
import {
  buildButtonSettingsModal,
  updatePanelMessage,
} from "../../services/reactionRolePanelBuilder";
import { reactionRoleAddButtonSessions } from "./reactionRoleSetupState";

/**
 * add-button フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleAddButtonSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_SELECT_PREFIX,
    );
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_SELECT_PREFIX.length,
    );
    const session = reactionRoleAddButtonSessions.get(sessionId);
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
    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(panelId);
    if (!panel) return;

    const existingButtons = parseButtons(panel.buttons);
    if (existingButtons.length >= REACTION_ROLE_MAX_BUTTONS) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.button_limit_reached",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    session.panelId = panelId;
    session.buttonCounter = panel.buttonCounter;

    // ボタン設定モーダルを表示
    const modal = buildButtonSettingsModal(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MODAL_PREFIX,
      sessionId,
      interaction.locale,
    );
    await interaction.showModal(modal);
  },
};

/**
 * add-button フローのボタン設定モーダルハンドラ
 */
export const reactionRoleAddButtonModalHandler: ModalHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MODAL_PREFIX);
  },

  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MODAL_PREFIX.length,
    );
    const session = reactionRoleAddButtonSessions.get(sessionId);
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

    // 前回のエフェメラルメッセージを削除（「もう1つ追加」ループ時）
    if (session.previousReplyInteraction) {
      await session.previousReplyInteraction.deleteReply().catch(() => null);
    }

    session.pendingButton = { label, emoji, style };

    // RoleSelectMenu を表示
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_ROLES_PREFIX}${sessionId}`,
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

    // 次のループで削除できるようインタラクションを保存
    session.previousReplyInteraction = interaction;
  },
};

/**
 * add-button フローのロール選択ハンドラ
 */
export const reactionRoleAddButtonRoleSelectHandler: RoleSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_ROLES_PREFIX);
  },

  async execute(interaction: RoleSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_ROLES_PREFIX.length,
    );
    const session = reactionRoleAddButtonSessions.get(sessionId);
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

    const roleIds = Array.from(interaction.roles.keys());
    session.buttonCounter++;
    session.buttons.push({
      buttonId: session.buttonCounter,
      label: session.pendingButton.label,
      emoji: session.pendingButton.emoji,
      style: session.pendingButton.style,
      roleIds,
    });
    session.pendingButton = undefined;

    // 既存ボタン数 + 追加済みボタン数で上限チェック
    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(session.panelId);
    const existingCount = panel ? parseButtons(panel.buttons).length : 0;
    const totalCount = existingCount + session.buttons.length;
    const atLimit = totalCount >= REACTION_ROLE_MAX_BUTTONS;

    // 「もう1つ追加」「完了」ボタンを表示
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MORE_PREFIX}${sessionId}`,
        )
        .setEmoji("➕")
        .setLabel(
          tInteraction(interaction.locale, "reactionRole:ui.button.setup_add"),
        )
        .setStyle(ButtonStyle.Primary)
        .setDisabled(atLimit),
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_DONE_PREFIX}${sessionId}`,
        )
        .setEmoji("✅")
        .setLabel(
          tInteraction(interaction.locale, "reactionRole:ui.button.setup_done"),
        )
        .setStyle(ButtonStyle.Success),
    );

    await interaction.update({
      components: [row],
    });
  },
};

/**
 * add-button フローの「もう1つ追加」「完了」ボタンハンドラ
 */
export const reactionRoleAddButtonButtonHandler: ButtonHandler = {
  matches(customId: string) {
    return (
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MORE_PREFIX) ||
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_DONE_PREFIX)
    );
  },

  async execute(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(
        REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MORE_PREFIX,
      )
    ) {
      // もう1つ追加 → ボタン設定モーダルを再表示
      const sessionId = interaction.customId.slice(
        REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MORE_PREFIX.length,
      );
      const session = reactionRoleAddButtonSessions.get(sessionId);
      if (!session) return;

      const modal = buildButtonSettingsModal(
        REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MODAL_PREFIX,
        sessionId,
        interaction.locale,
      );
      await interaction.showModal(modal);
    } else {
      // 完了 → パネルを更新
      const sessionId = interaction.customId.slice(
        REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_DONE_PREFIX.length,
      );
      const session = reactionRoleAddButtonSessions.get(sessionId);
      if (!session) return;

      await interaction.deferUpdate();

      const configService = getBotReactionRolePanelConfigService();
      const panel = await configService.findById(session.panelId);
      if (!panel) return;

      const existingButtons = parseButtons(panel.buttons);
      const allButtons = [...existingButtons, ...session.buttons];

      // DB更新
      await configService.update(session.panelId, {
        buttons: JSON.stringify(allButtons),
        buttonCounter: session.buttonCounter,
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
        reactionRoleAddButtonSessions.delete(sessionId);
        return;
      }

      // フローメッセージを削除
      await interaction.deleteReply().catch(() => null);
      // セレクトメニューメッセージを削除
      await session.commandInteraction?.deleteReply().catch(() => null);

      const count = session.buttons.length;
      const embed = createSuccessEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.add_button_success",
          { count },
        ),
        { locale: interaction.locale },
      );
      await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });

      for (const btn of session.buttons) {
        logger.info(
          logPrefixed(
            "system:log_prefix.reaction_role",
            "reactionRole:log.button_added",
            {
              guildId: interaction.guildId ?? "",
              panelId: session.panelId,
              buttonId: String(btn.buttonId),
            },
          ),
        );
      }

      reactionRoleAddButtonSessions.delete(sessionId);
    }
  },
};
