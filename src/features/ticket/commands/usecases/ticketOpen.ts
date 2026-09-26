// チケット再オープン処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../../bot/services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { findTicketConfigOrReply } from "../../services/ticketGuards";
import {
  hasTicketPermission,
  reopenTicket,
} from "../../services/ticketService";
import { TICKET_STATUS } from "../ticketCommand.constants";

/**
 * ticket open サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 */
export async function handleTicketOpen(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const ticketRepository = getBotTicketRepository();
  const settingsService = getBotTicketSettingsService();

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

  // 既にオープン済みか確認
  if (ticket.status === TICKET_STATUS.OPEN) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "ticket:user-response.ticket_already_open",
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
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;
  const staffRoleIds: string[] = config.staffRoleIds;

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

  // チケットを再オープン
  await reopenTicket(ticket, guild, settingsService, ticketRepository);

  logger.info(
    logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_opened", {
      guildId: ticket.guildId,
      channelId: ticket.channelId,
      openedBy: interaction.user.id,
    }),
  );

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.ticket_opened"),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
