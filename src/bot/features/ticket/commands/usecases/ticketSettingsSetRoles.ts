// src/bot/features/ticket/commands/usecases/ticketSettingsSetRoles.ts
// チケットスタッフロール設定処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  RoleSelectMenuBuilder,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotTicketSettingsService } from "../../../../services/botCompositionRoot";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  TICKET_CUSTOM_ID,
  TICKET_MAX_STAFF_ROLES,
  TICKET_SETTINGS_COMMAND,
} from "../ticketCommand.constants";

/**
 * ticket-settings set-roles サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketSettingsSetRoles(
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

  // ロール選択メニューを送信
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(`${TICKET_CUSTOM_ID.SET_ROLES_PREFIX}${categoryId}`)
    .setPlaceholder(
      tInteraction(interaction.locale, "ticket:ui.select.roles_placeholder"),
    )
    .setMinValues(1)
    .setMaxValues(TICKET_MAX_STAFF_ROLES);

  const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    roleSelect,
  );

  await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
