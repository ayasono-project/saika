// src/bot/features/ticket/handlers/ui/ticketEditPanelModalHandler.ts
// パネル編集モーダル送信ハンドラ

import {
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotTicketConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";

/**
 * パネル編集モーダルの送信を処理するハンドラ
 */
export const ticketEditPanelModalHandler: ModalHandler = {
  /**
   * カスタムIDがパネル編集モーダルプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX);
  },

  /**
   * パネル編集モーダルの送信を処理する
   * @param interaction モーダル送信インタラクション
   */
  async execute(interaction: ModalSubmitInteraction) {
    const categoryId = interaction.customId.slice(
      TICKET_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX.length,
    );
    const title = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.EDIT_PANEL_TITLE,
    );
    const description = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.EDIT_PANEL_DESCRIPTION,
    );
    const colorInput = interaction.fields
      .getTextInputValue(TICKET_CUSTOM_ID.EDIT_PANEL_COLOR)
      .trim();

    const configService = getBotTicketConfigService();
    const guildId = interaction.guildId;
    if (!guildId) return;

    // カラー値のバリデーション（空の場合は現在の値を維持）
    const panelColor =
      colorInput && /^#[0-9A-Fa-f]{6}$/.test(colorInput) ? colorInput : null;
    if (colorInput && !panelColor) {
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

    const config = await configService.findByGuildAndCategory(
      guildId,
      categoryId,
    );
    if (!config) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.config_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const resolvedColor = panelColor ?? config.panelColor;

    // パネルメッセージの存在確認（Bot オフライン中の削除を検知）
    const guild = interaction.guild;
    const panelChannel = guild
      ? ((await guild.channels
          .fetch(config.panelChannelId)
          .catch(() => null)) as TextChannel | null)
      : null;
    const panelMessage = panelChannel
      ? await panelChannel.messages
          .fetch(config.panelMessageId)
          .catch(() => null)
      : null;

    if (!panelMessage) {
      // パネルメッセージが削除済み → DB クリーンアップ
      await configService.delete(guildId, categoryId);
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "ticket:user-response.panel_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // DB の設定を更新
    await configService.update(guildId, categoryId, {
      panelTitle: title,
      panelDescription: description,
      panelColor: resolvedColor,
    });

    // パネルメッセージの Embed を更新
    const updatedEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(Number.parseInt(resolvedColor.slice(1), 16));
    await panelMessage.edit({
      embeds: [updatedEmbed],
    });

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "ticket:user-response.edit_panel_success",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
