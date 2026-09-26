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
import {
  canOperateTicketOrReply,
  findHandleableTicketChannelOrReply,
  findTicketConfigOrReply,
} from "../../services/ticketGuards";
import { reopenTicket } from "../../services/ticketService";
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

  // 設定を取得（スタッフロールは権限チェックに使う）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // 権限チェック（作成者・スタッフロール・管理者権限）。どれも無ければ、誰が操作できるかを返信する
  if (
    !(await canOperateTicketOrReply(interaction, ticket, config, "close_open"))
  ) {
    return;
  }

  // Bot がチャンネルを扱えない（Bot を外して入れ直した後の古いチケット等）なら、何も変えずに理由と対処を返信する
  if (!(await findHandleableTicketChannelOrReply(interaction, guild, ticket))) {
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
