// src/bot/features/ticket/handlers/ui/ticketButtonHandler.ts
// チケット操作ボタン（close/open/delete）ハンドラ

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  parseStaffRoleIds,
  TICKET_CUSTOM_ID,
  TICKET_STATUS,
} from "../../commands/ticketCommand.constants";
import {
  closeTicket,
  deleteTicket,
  hasStaffRole,
  hasTicketPermission,
  reopenTicket,
} from "../../services/ticketService";

/**
 * メンバーのロールID一覧を取得する
 * @param interaction ボタンインタラクション
 * @returns ロールIDの配列
 */
function getMemberRoleIds(interaction: ButtonInteraction): string[] {
  return Array.from(
    interaction.member && "cache" in interaction.member.roles
      ? interaction.member.roles.cache.keys()
      : [],
  );
}

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
  const configService = getBotTicketConfigService();

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

  // スタッフロールと操作権限を確認
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];
  const memberRoleIds = getMemberRoleIds(interaction);

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

  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
  const configService = getBotTicketConfigService();

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

  // スタッフロールと操作権限を確認
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];
  const memberRoleIds = getMemberRoleIds(interaction);

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

  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await reopenTicket(ticket, guild, configService, ticketRepository);

  logger.info(
    logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_opened", {
      guildId: ticket.guildId,
      channelId: ticket.channelId,
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
  const configService = getBotTicketConfigService();

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

  // スタッフロール権限を確認（削除はスタッフのみ可能）
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];
  const memberRoleIds = getMemberRoleIds(interaction);

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
  const configService = getBotTicketConfigService();

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

  // スタッフロール権限を確認（削除はスタッフのみ可能）
  const config = await configService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  const staffRoleIds: string[] = config
    ? parseStaffRoleIds(config.staffRoleIds)
    : [];
  const memberRoleIds = getMemberRoleIds(interaction);

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
    }),
  );

  const guild = interaction.guild;
  if (!guild) return;

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
