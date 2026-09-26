// チケット作成パネルボタンハンドラ

import {
  ActionRowBuilder,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { ButtonHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../../bot/services/botCompositionRoot";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { findCreatableTicketConfigOrReply } from "../../services/ticketGuards";

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
    const settingsService = getBotTicketSettingsService();
    const ticketRepository = getBotTicketRepository();
    const guildId = interaction.guildId;
    if (!guildId) return;

    // パネルの設定と、ユーザーのオープンチケット数を確認（送信時にも確かめ直す）
    const config = await findCreatableTicketConfigOrReply(
      interaction,
      guildId,
      categoryId,
      settingsService,
      ticketRepository,
    );
    if (!config) return;

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
