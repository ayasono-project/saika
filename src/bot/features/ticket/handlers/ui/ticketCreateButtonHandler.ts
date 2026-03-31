// src/bot/features/ticket/handlers/ui/ticketCreateButtonHandler.ts
// チケット作成パネルボタンハンドラ

import {
  ActionRowBuilder,
  type ButtonInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";

/**
 * チケット作成ボタンを処理するハンドラ
 */
export const ticketCreateButtonHandler: ButtonHandler = {
  /**
   * カスタムIDがチケット作成プレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.CREATE_PREFIX);
  },

  /**
   * チケット作成ボタンの操作を処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    const categoryId = interaction.customId.slice(
      TICKET_CUSTOM_ID.CREATE_PREFIX.length,
    );
    const configService = getBotTicketConfigService();
    const ticketRepository = getBotTicketRepository();
    const guildId = interaction.guildId;
    if (!guildId) return;

    const config = await configService.findByGuildAndCategory(
      guildId,
      categoryId,
    );
    if (!config) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.panel_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ユーザーのオープンチケット数を確認
    const openTickets = await ticketRepository.findOpenByUserAndCategory(
      guildId,
      categoryId,
      interaction.user.id,
    );
    if (openTickets.length >= config.maxTicketsPerUser) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.max_tickets_reached",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // チケット作成モーダルを表示
    const modal = new ModalBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.CREATE_MODAL_PREFIX}${categoryId}`)
      .setTitle(
        tInteraction(interaction.locale, "ticket:ui.modal.create_ticket_title"),
      )
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(TICKET_CUSTOM_ID.CREATE_MODAL_SUBJECT)
            .setLabel(
              tInteraction(
                interaction.locale,
                "ticket:ui.modal.create_ticket_subject",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(TICKET_CUSTOM_ID.CREATE_MODAL_DETAIL)
            .setLabel(
              tInteraction(
                interaction.locale,
                "ticket:ui.modal.create_ticket_detail",
              ),
            )
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000),
        ),
      );

    await interaction.showModal(modal);
  },
};
