// src/bot/features/ticket/commands/usecases/ticketSettingsSetAutoDelete.ts
// チケット自動削除日数設定処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotTicketSettingsService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { TICKET_SETTINGS_COMMAND } from "../ticketCommand.constants";

/**
 * ticket-settings set-auto-delete サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketSettingsSetAutoDelete(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const settingsService = getBotTicketSettingsService();
  const categoryId = interaction.options.getChannel(
    TICKET_SETTINGS_COMMAND.OPTION.CATEGORY,
    true,
  ).id;
  const days = interaction.options.getInteger(
    TICKET_SETTINGS_COMMAND.OPTION.DAYS,
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

  // 自動削除日数を更新
  await settingsService.update(guildId, categoryId, { autoDeleteDays: days });

  const embed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "ticket:user-response.set_auto_delete_success",
      {
        days,
      },
    ),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
