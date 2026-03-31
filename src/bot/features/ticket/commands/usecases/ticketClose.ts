// src/bot/features/ticket/commands/usecases/ticketClose.ts
// チケットクローズ処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { closeTicket, hasTicketPermission } from "../../services/ticketService";
import { parseStaffRoleIds, TICKET_STATUS } from "../ticketCommand.constants";

/**
 * ticket close サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 */
export async function handleTicketClose(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const ticketRepository = getBotTicketRepository();
  const configService = getBotTicketConfigService();

  // チャンネルIDからチケットを取得
  const ticket = await ticketRepository.findByChannelId(interaction.channelId);
  if (!ticket) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "ticket:user-response.not_ticket_channel",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 既にクローズ済みか確認
  if (ticket.status === TICKET_STATUS.CLOSED) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "ticket:user-response.ticket_already_closed",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 設定を取得してスタッフロールを解析
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];

  // 権限チェック（作成者またはスタッフロール）
  const memberRoleIds = Array.from(
    interaction.member && "cache" in interaction.member.roles
      ? interaction.member.roles.cache.keys()
      : [],
  );
  if (
    !hasTicketPermission(
      ticket,
      interaction.user.id,
      memberRoleIds,
      staffRoleIds,
    )
  ) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.not_authorized"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // チケットをクローズ
  await closeTicket(ticket, guild, configService, ticketRepository);

  logger.info(
    logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_closed", {
      guildId: ticket.guildId,
      channelId: ticket.channelId,
    }),
  );

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.ticket_closed"),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
