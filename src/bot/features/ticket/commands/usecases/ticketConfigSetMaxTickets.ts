// src/bot/features/ticket/commands/usecases/ticketConfigSetMaxTickets.ts
// チケット最大作成数設定処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotTicketConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { TICKET_CONFIG_COMMAND } from "../ticketCommand.constants";

/**
 * ticket-config set-max-tickets サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketConfigSetMaxTickets(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const configService = getBotTicketConfigService();
  const categoryId = interaction.options.getChannel(
    TICKET_CONFIG_COMMAND.OPTION.CATEGORY,
    true,
  ).id;
  const count = interaction.options.getInteger(
    TICKET_CONFIG_COMMAND.OPTION.COUNT,
    true,
  );

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

  // 最大チケット数を更新
  await configService.update(guildId, categoryId, {
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
