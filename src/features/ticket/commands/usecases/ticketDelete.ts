// チケット削除確認ダイアログ表示処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../../bot/services/botCompositionRoot";
import { createErrorEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  canOperateTicketOrReply,
  findHandleableTicketChannelOrReply,
  findTicketConfigOrReply,
} from "../../services/ticketGuards";
import {
  TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  TICKET_CUSTOM_ID,
} from "../ticketCommand.constants";

/**
 * ticket delete サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 */
export async function handleTicketDelete(
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

  // 設定を取得（スタッフロールは権限チェックに使う）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // 権限チェック（スタッフロール・管理者権限。作成者だけでは削除できない）。無ければ、誰が削除できるかを返信する
  if (!(await canOperateTicketOrReply(interaction, ticket, config, "delete"))) {
    return;
  }

  // Bot がチャンネルを扱えない（Bot を外して入れ直した後の古いチケット等）か、削除に要る「チャンネルの管理」が
  // 無いなら、確認を出す前に理由と対処を返信する
  if (
    !(await findHandleableTicketChannelOrReply(
      interaction,
      guild,
      ticket,
      TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
    ))
  ) {
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
