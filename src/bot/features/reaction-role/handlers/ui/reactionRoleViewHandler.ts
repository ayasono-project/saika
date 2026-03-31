// src/bot/features/reaction-role/handlers/ui/reactionRoleViewHandler.ts
// view フローのページネーション・セレクトメニューハンドラ

import {
  ActionRowBuilder,
  type ButtonInteraction,
  ComponentType,
  type MessageActionRowComponent,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type {
  ButtonHandler,
  StringSelectHandler,
} from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  buildPaginationRow,
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "../../../../shared/pagination";
import { REACTION_ROLE_CUSTOM_ID } from "../../commands/reactionRoleCommand.constants";
import { buildViewEmbed } from "../../commands/usecases/reactionRoleConfigView";

/**
 * view フローのページネーションボタンハンドラ
 */
export const reactionRoleViewButtonHandler: ButtonHandler = {
  matches(customId: string) {
    return (
      parsePaginationAction(customId, REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX) !==
      null
    );
  },

  async execute(interaction: ButtonInteraction) {
    const action = parsePaginationAction(
      interaction.customId,
      REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX,
    );
    if (!action) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    const configService = getBotReactionRolePanelConfigService();
    const panels = await configService.findAllByGuild(guildId);
    if (panels.length === 0) return;

    // 現在のページをページジャンプボタンのラベルから取得（「1/3ページ」形式）
    let currentPage = 0;
    const allComponents = interaction.message.components.flatMap(
      (row) =>
        (row as unknown as { components: MessageActionRowComponent[] })
          .components,
    );
    const jumpButton = allComponents.find(
      (c) =>
        c.type === ComponentType.Button &&
        c.customId === `${REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX}:page-jump`,
    );
    if (
      jumpButton &&
      jumpButton.type === ComponentType.Button &&
      jumpButton.label
    ) {
      const match = jumpButton.label.match(/^(\d+)/);
      if (match) {
        currentPage = Number(match[1]) - 1;
      }
    }

    if (action === "jump") {
      const input = await showPaginationJumpModal(
        interaction,
        REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX,
        panels.length,
        interaction.locale,
      );
      if (!input) return;
      const pageNum = Number(input);
      if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > panels.length)
        return;
      currentPage = pageNum - 1;
    } else {
      currentPage = resolvePageFromAction(action, currentPage, panels.length);
      await interaction.deferUpdate();
    }

    const embed = buildViewEmbed(panels, currentPage, interaction.locale);
    const paginationRow = buildPaginationRow(
      REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX,
      currentPage,
      panels.length,
      interaction.locale,
    );

    // セレクトメニューの再構築
    const guild = interaction.guild;
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.VIEW_SELECT_PREFIX}${interaction.id}`,
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.panel_placeholder",
        ),
      )
      .addOptions(
        panels.map((panel, index) => {
          const channelName =
            guild?.channels.cache.get(panel.channelId)?.name ?? panel.channelId;
          return {
            label: panel.title,
            description: `#${channelName}`,
            value: String(index),
            default: index === currentPage,
          };
        }),
      );

    const menuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({
      embeds: [embed],
      components: [paginationRow, menuRow],
    });
  },
};

/**
 * view フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleViewSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.VIEW_SELECT_PREFIX);
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const configService = getBotReactionRolePanelConfigService();
    const panels = await configService.findAllByGuild(guildId);
    if (panels.length === 0) return;

    const selectedPage = Number(interaction.values[0]);

    const embed = buildViewEmbed(panels, selectedPage, interaction.locale);
    const paginationRow = buildPaginationRow(
      REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX,
      selectedPage,
      panels.length,
      interaction.locale,
    );

    const guild = interaction.guild;
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.VIEW_SELECT_PREFIX}${interaction.id}`,
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.panel_placeholder",
        ),
      )
      .addOptions(
        panels.map((panel, index) => {
          const channelName =
            guild?.channels.cache.get(panel.channelId)?.name ?? panel.channelId;
          return {
            label: panel.title,
            description: `#${channelName}`,
            value: String(index),
            default: index === selectedPage,
          };
        }),
      );

    const menuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      embeds: [embed],
      components: [paginationRow, menuRow],
    });
  },
};
