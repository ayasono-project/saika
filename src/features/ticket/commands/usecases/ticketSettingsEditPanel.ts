// src/bot/features/ticket/commands/usecases/ticketSettingsEditPanel.ts
// チケットパネル編集モーダル表示処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getBotTicketSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createErrorEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  TICKET_CUSTOM_ID,
  TICKET_SETTINGS_COMMAND,
} from "../ticketCommand.constants";

/**
 * ticket-settings edit-panel サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketSettingsEditPanel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const settingsService = getBotTicketSettingsService();
  const categoryId = interaction.options.getChannel(
    TICKET_SETTINGS_COMMAND.OPTION.CATEGORY,
    true,
  ).id;

  const config = await settingsService.findByGuildAndCategory(
    guildId,
    categoryId,
  );
  if (!config) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.config_not_found"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // パネル編集モーダルを表示
  const modal = new ModalBuilder()
    .setCustomId(`${TICKET_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX}${categoryId}`)
    .setTitle(
      tInteraction(interaction.locale, "ticket:ui.modal.edit_panel_title"),
    )
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CUSTOM_ID.EDIT_PANEL_TITLE)
          .setLabel(
            tInteraction(
              interaction.locale,
              "ticket:ui.modal.setup_field_title",
            ),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(config.panelTitle),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CUSTOM_ID.EDIT_PANEL_DESCRIPTION)
          .setLabel(
            tInteraction(
              interaction.locale,
              "ticket:ui.modal.setup_field_description",
            ),
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(config.panelDescription),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(TICKET_CUSTOM_ID.EDIT_PANEL_COLOR)
          .setLabel(
            tInteraction(
              interaction.locale,
              "ticket:ui.modal.edit_panel_field_color",
            ),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(config.panelColor),
      ),
    );

  await interaction.showModal(modal);
}
