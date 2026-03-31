// src/bot/features/ticket/commands/usecases/ticketDelete.ts
// チケット削除確認ダイアログ表示処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import { hasStaffRole } from "../../services/ticketService";
import {
  parseStaffRoleIds,
  TICKET_CUSTOM_ID,
} from "../ticketCommand.constants";

/**
 * ticket delete サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 */
export async function handleTicketDelete(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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

  // 設定を取得してスタッフロールを解析
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];

  // 権限チェック（スタッフロールのみ）
  const memberRoleIds = Array.from(
    interaction.member && "cache" in interaction.member.roles
      ? interaction.member.roles.cache.keys()
      : [],
  );
  if (!hasStaffRole(memberRoleIds, staffRoleIds)) {
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

  // 削除確認ダイアログを表示
  const confirmEmbed = createErrorEmbed(
    tInteraction(interaction.locale, "ticket:embed.description.delete_warning"),
    {
      title: tInteraction(
        interaction.locale,
        "ticket:embed.title.delete_confirm",
      ),
      locale: interaction.locale,
    },
  );

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_CONFIRM_PREFIX}${ticket.id}`)
      .setEmoji("🗑️")
      .setLabel(
        tInteraction(interaction.locale, "ticket:ui.button.delete_confirm"),
      )
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_CANCEL_PREFIX}${ticket.id}`)
      .setEmoji("❌")
      .setLabel(tInteraction(interaction.locale, "common:ui.button.cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    embeds: [confirmEmbed],
    components: [buttons],
    flags: MessageFlags.Ephemeral,
  });
}
