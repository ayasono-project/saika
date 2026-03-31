// src/bot/features/ticket/commands/usecases/ticketConfigEditPanel.ts
// チケットパネル編集モーダル表示処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotTicketConfigService } from "../../../../services/botCompositionRoot";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  TICKET_CONFIG_COMMAND,
  TICKET_CUSTOM_ID,
} from "../ticketCommand.constants";

/**
 * ticket-config edit-panel サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketConfigEditPanel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const configService = getBotTicketConfigService();
  const categoryId = interaction.options.getChannel(
    TICKET_CONFIG_COMMAND.OPTION.CATEGORY,
    true,
  ).id;

  const config = await configService.findByGuildAndCategory(
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
