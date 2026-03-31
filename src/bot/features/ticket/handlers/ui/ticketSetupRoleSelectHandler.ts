// src/bot/features/ticket/handlers/ui/ticketSetupRoleSelectHandler.ts
// setup フローのロール選択ハンドラ

import {
  ActionRowBuilder,
  ModalBuilder,
  type RoleSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { RoleSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  TICKET_CUSTOM_ID,
  TICKET_DEFAULT_PANEL_COLOR,
} from "../../commands/ticketCommand.constants";
import { ticketSetupSessions } from "./ticketSetupState";

/**
 * setup フローのロール選択メニューを処理するハンドラ
 */
export const ticketSetupRoleSelectHandler: RoleSelectHandler = {
  /**
   * カスタムIDがセットアップロール選択プレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.SETUP_ROLES_PREFIX);
  },

  /**
   * セットアップフローのロール選択を処理する
   * @param interaction ロール選択メニューインタラクション
   */
  async execute(interaction: RoleSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      TICKET_CUSTOM_ID.SETUP_ROLES_PREFIX.length,
    );
    const session = ticketSetupSessions.get(sessionId);
    if (!session) return;

    // 選択されたロールIDをセッションに保存
    session.staffRoleIds = Array.from(interaction.roles.keys());

    // パネルタイトル・説明入力モーダルを表示
    const modal = new ModalBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.SETUP_MODAL_PREFIX}${sessionId}`)
      .setTitle(tInteraction(interaction.locale, "ticket:ui.modal.setup_title"))
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(TICKET_CUSTOM_ID.SETUP_MODAL_TITLE)
            .setLabel(
              tInteraction(
                interaction.locale,
                "ticket:ui.modal.setup_field_title",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(
              tInteraction(
                interaction.locale,
                "ticket:embed.title.panel_default",
              ),
            ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(TICKET_CUSTOM_ID.SETUP_MODAL_DESCRIPTION)
            .setLabel(
              tInteraction(
                interaction.locale,
                "ticket:ui.modal.setup_field_description",
              ),
            )
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(
              tInteraction(
                interaction.locale,
                "ticket:embed.description.panel_default",
              ),
            ),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(TICKET_CUSTOM_ID.SETUP_MODAL_COLOR)
            .setLabel(
              tInteraction(
                interaction.locale,
                "ticket:ui.modal.setup_field_color",
              ),
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(TICKET_DEFAULT_PANEL_COLOR),
        ),
      );

    await interaction.showModal(modal);
  },
};
