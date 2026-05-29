// src/bot/features/ticket/commands/usecases/ticketSettingsSetMaxTickets.ts
// チケット最大作成数設定処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotTicketSettingsService } from "../../../../bot/services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { TICKET_SETTINGS_COMMAND } from "../ticketCommand.constants";

/**
 * ticket-settings set-max-tickets サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketSettingsSetMaxTickets(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const settingsService = getBotTicketSettingsService();
  const categoryId = interaction.options.getChannel(
    TICKET_SETTINGS_COMMAND.OPTION.CATEGORY,
    true,
  ).id;
  const count = interaction.options.getInteger(
    TICKET_SETTINGS_COMMAND.OPTION.COUNT,
    true,
  );

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

  // 最大チケット数を更新
  await settingsService.update(guildId, categoryId, {
    maxTicketsPerUser: count,
  });

  const embed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "ticket:user-response.set_max_tickets_success",
      {
        count,
      },
    ),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
