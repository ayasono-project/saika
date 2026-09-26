// チケット操作ボタン（close/open/delete）ハンドラ

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import type { ButtonHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
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
  TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
  TICKET_CUSTOM_ID,
  TICKET_STATUS,
} from "../../commands/ticketCommand.constants";
import {
  canOperateTicketOrReply,
  findHandleableTicketChannelOrReply,
  findTicketConfigOrReply,
} from "../../services/ticketGuards";
import {
  closeTicket,
  deleteTicket,
  reopenTicket,
} from "../../services/ticketService";

/**
 * チケット操作ボタン（close/open/delete/confirm/cancel）を処理するハンドラ
 */
export const ticketButtonHandler: ButtonHandler = {
  /**
   * カスタムIDがチケット操作ボタンのプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return (
      customId.startsWith(TICKET_CUSTOM_ID.CLOSE_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.OPEN_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.DELETE_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.DELETE_CONFIRM_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.DELETE_CANCEL_PREFIX)
    );
  },

  /**
   * チケット操作ボタンのインタラクションを処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    // カスタムIDのプレフィックスに応じて処理を振り分け
    if (interaction.customId.startsWith(TICKET_CUSTOM_ID.CLOSE_PREFIX)) {
      await handleClose(interaction);
    } else if (interaction.customId.startsWith(TICKET_CUSTOM_ID.OPEN_PREFIX)) {
      await handleOpen(interaction);
    } else if (
      interaction.customId.startsWith(TICKET_CUSTOM_ID.DELETE_CONFIRM_PREFIX)
    ) {
      await handleDeleteConfirm(interaction);
    } else if (
      interaction.customId.startsWith(TICKET_CUSTOM_ID.DELETE_CANCEL_PREFIX)
    ) {
      await handleDeleteCancel(interaction);
    } else if (
      interaction.customId.startsWith(TICKET_CUSTOM_ID.DELETE_PREFIX)
    ) {
      await handleDelete(interaction);
    }
  },
};

/**
 * チケットクローズ処理
 * @param interaction ボタンインタラクション
 */
async function handleClose(interaction: ButtonInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(
    TICKET_CUSTOM_ID.CLOSE_PREFIX.length,
  );
  const ticketRepository = getBotTicketRepository();
  const settingsService = getBotTicketSettingsService();

  const ticket = await ticketRepository.findById(ticketId);
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

  // 既にクローズ済みの場合はエラー通知
  if (ticket.status !== TICKET_STATUS.OPEN) {
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

  // 押した人の権限を確認（作成者・スタッフロール・管理者権限）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // 作成者・スタッフロール・管理者権限のどれも無ければ、誰が操作できるかを返信する
  if (
    !(await canOperateTicketOrReply(interaction, ticket, config, "close_open"))
  ) {
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  // Bot がチャンネルを扱えない（Bot を外して入れ直した後の古いチケット等）なら、何も変えずに理由と対処を返信する
  if (!(await findHandleableTicketChannelOrReply(interaction, guild, ticket))) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await closeTicket(ticket, guild, settingsService, ticketRepository);

  logger.info(
    logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_closed", {
      guildId: ticket.guildId,
      channelId: ticket.channelId,
      closedBy: interaction.user.id,
    }),
  );

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.ticket_closed"),
    { locale: interaction.locale },
  );
  await interaction.editReply({
    embeds: [embed],
  });
}

/**
 * チケット再オープン処理
 * @param interaction ボタンインタラクション
 */
async function handleOpen(interaction: ButtonInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(
    TICKET_CUSTOM_ID.OPEN_PREFIX.length,
  );
  const ticketRepository = getBotTicketRepository();
  const settingsService = getBotTicketSettingsService();

  const ticket = await ticketRepository.findById(ticketId);
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

  // 既にオープン済みの場合はエラー通知
  if (ticket.status !== TICKET_STATUS.CLOSED) {
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

  // 押した人の権限を確認（作成者・スタッフロール・管理者権限）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // 作成者・スタッフロール・管理者権限のどれも無ければ、誰が操作できるかを返信する
  if (
    !(await canOperateTicketOrReply(interaction, ticket, config, "close_open"))
  ) {
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  // Bot がチャンネルを扱えない（Bot を外して入れ直した後の古いチケット等）なら、何も変えずに理由と対処を返信する
  if (!(await findHandleableTicketChannelOrReply(interaction, guild, ticket))) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
  await interaction.editReply({
    embeds: [embed],
  });
}

/**
 * チケット削除確認ダイアログ表示処理
 * @param interaction ボタンインタラクション
 */
async function handleDelete(interaction: ButtonInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(
    TICKET_CUSTOM_ID.DELETE_PREFIX.length,
  );
  const ticketRepository = getBotTicketRepository();
  const settingsService = getBotTicketSettingsService();

  const ticket = await ticketRepository.findById(ticketId);
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

  // 操作権限を確認（削除はスタッフロールか管理者権限を持つメンバーのみ可能）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // スタッフロールも管理者権限も無ければ（作成者でも）、誰が削除できるかを返信する
  if (!(await canOperateTicketOrReply(interaction, ticket, config, "delete"))) {
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

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
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_CONFIRM_PREFIX}${ticketId}`)
      .setEmoji("🗑️")
      .setLabel(
        tInteraction(interaction.locale, "ticket:ui.button.delete_confirm"),
      )
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.DELETE_CANCEL_PREFIX}${ticketId}`)
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

/**
 * チケット削除確認処理
 * @param interaction ボタンインタラクション
 */
async function handleDeleteConfirm(
  interaction: ButtonInteraction,
): Promise<void> {
  const ticketId = interaction.customId.slice(
    TICKET_CUSTOM_ID.DELETE_CONFIRM_PREFIX.length,
  );
  const ticketRepository = getBotTicketRepository();
  const settingsService = getBotTicketSettingsService();

  const ticket = await ticketRepository.findById(ticketId);
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

  // 操作権限を確認（削除はスタッフロールか管理者権限を持つメンバーのみ可能）
  // カテゴリの設定が無い（パネルが削除された）チケットは操作できない旨を返信する
  const config = await findTicketConfigOrReply(
    interaction,
    ticket,
    settingsService,
  );
  if (!config) return;

  // スタッフロールも管理者権限も無ければ（作成者でも）、誰が削除できるかを返信する
  if (!(await canOperateTicketOrReply(interaction, ticket, config, "delete"))) {
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  // 確認を出した後に権限が変わっていることもあるので、削除の直前にも確かめる
  // （扱えないまま進めると、記録だけが消えてチャンネルが残るため）
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

  // 先に応答してからチケットを削除（チャンネル削除で応答できなくなるため）
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.ticket_deleted"),
    { locale: interaction.locale },
  );
  await interaction
    .reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
    .catch(() => null);

  logger.info(
    logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_deleted", {
      guildId: ticket.guildId,
      channelId: ticket.channelId,
      deletedBy: interaction.user.id,
    }),
  );

  await deleteTicket(ticket, guild, ticketRepository);
}

/**
 * チケット削除キャンセル処理
 * @param interaction ボタンインタラクション
 */
async function handleDeleteCancel(
  interaction: ButtonInteraction,
): Promise<void> {
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.delete_cancelled"),
    { locale: interaction.locale },
  );
  await interaction.update({
    embeds: [embed],
    components: [],
  });
}
