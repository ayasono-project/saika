// src/bot/features/ticket/handlers/ui/ticketSetupModalHandler.ts
// setup フローのモーダル送信ハンドラ

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotTicketConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  TICKET_CUSTOM_ID,
  TICKET_DEFAULT_AUTO_DELETE_DAYS,
  TICKET_DEFAULT_MAX_TICKETS_PER_USER,
  TICKET_DEFAULT_PANEL_COLOR,
} from "../../commands/ticketCommand.constants";
import { ticketSetupSessions } from "./ticketSetupState";

/**
 * setup フローのモーダル送信を処理するハンドラ
 */
export const ticketSetupModalHandler: ModalHandler = {
  /**
   * カスタムIDがセットアップモーダルプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.SETUP_MODAL_PREFIX);
  },

  /**
   * セットアップモーダルの送信を処理する
   * @param interaction モーダル送信インタラクション
   */
  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      TICKET_CUSTOM_ID.SETUP_MODAL_PREFIX.length,
    );
    const session = ticketSetupSessions.get(sessionId);
    if (!session) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const title = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.SETUP_MODAL_TITLE,
    );
    const description = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.SETUP_MODAL_DESCRIPTION,
    );
    const colorInput = interaction.fields
      .getTextInputValue(TICKET_CUSTOM_ID.SETUP_MODAL_COLOR)
      .trim();
    const panelColor = colorInput || TICKET_DEFAULT_PANEL_COLOR;

    // カラーコードのバリデーション
    if (!/^#[0-9A-Fa-f]{6}$/.test(panelColor)) {
      const embed = createErrorEmbed(
        tInteraction(interaction.locale, "ticket:user-response.invalid_color"),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const configService = getBotTicketConfigService();
    const guildId = interaction.guildId;
    if (!guildId) return;

    // 既にそのカテゴリに設定があるか確認
    const existingConfig = await configService.findByGuildAndCategory(
      guildId,
      session.categoryId,
    );
    if (existingConfig) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.category_already_setup",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      ticketSetupSessions.delete(sessionId);
      return;
    }

    // パネル Embed + ボタンを構築
    const panelEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(Number.parseInt(panelColor.slice(1), 16));

    const panelButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_CUSTOM_ID.CREATE_PREFIX}${session.categoryId}`)
        .setEmoji("🎫")
        .setLabel(
          tInteraction(interaction.locale, "ticket:ui.button.create_ticket"),
        )
        .setStyle(ButtonStyle.Primary),
    );

    // パネルメッセージを送信
    const channel = interaction.channel as TextChannel | null;
    if (!channel) return;

    // MissingPermissions は上位の interactionErrorHandler で統一処理される
    const panelMessage = await channel.send({
      embeds: [panelEmbed],
      components: [panelButton],
    });

    // DB に設定を保存
    await configService.create({
      guildId,
      categoryId: session.categoryId,
      enabled: true,
      staffRoleIds: JSON.stringify(session.staffRoleIds),
      panelChannelId: interaction.channelId ?? channel.id,
      panelMessageId: panelMessage.id,
      panelTitle: title,
      panelDescription: description,
      panelColor,
      autoDeleteDays: TICKET_DEFAULT_AUTO_DELETE_DAYS,
      maxTicketsPerUser: TICKET_DEFAULT_MAX_TICKETS_PER_USER,
      ticketCounter: 0,
    });

    // ロール選択メニューのメッセージを削除
    await session.commandInteraction.deleteReply().catch(() => null);

    // エフェメラルで成功通知
    const successEmbed = createSuccessEmbed(
      tInteraction(interaction.locale, "ticket:user-response.setup_success"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [successEmbed],
      flags: MessageFlags.Ephemeral,
    });

    // セッションを削除
    ticketSetupSessions.delete(sessionId);

    logger.info(
      logPrefixed("system:log_prefix.ticket", "ticket:log.setup", {
        guildId,
        categoryId: session.categoryId,
        channelId: panelMessage.channelId,
      }),
    );
  },
};
