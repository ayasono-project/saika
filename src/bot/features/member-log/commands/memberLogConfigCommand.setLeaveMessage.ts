// src/bot/features/member-log/commands/memberLogConfigCommand.setLeaveMessage.ts
// member-log-config set-leave-message 実行処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { MEMBER_LOG_CONFIG_COMMAND } from "./memberLogConfigCommand.constants";
import { ensureMemberLogManageGuildPermission } from "./memberLogConfigCommand.guard";

/**
 * カスタム退出メッセージ設定モーダルを表示する
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigSetLeaveMessage(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  const modal = new ModalBuilder()
    .setCustomId(MEMBER_LOG_CONFIG_COMMAND.SET_LEAVE_MESSAGE_MODAL_ID)
    .setTitle(
      tInteraction(
        interaction.locale,
        "memberLog:ui.modal.set_leave_message_title",
      ),
    );

  const messageInput = new TextInputBuilder()
    .setCustomId(MEMBER_LOG_CONFIG_COMMAND.MODAL_INPUT_MESSAGE)
    .setLabel(
      tInteraction(
        interaction.locale,
        "memberLog:ui.modal.set_leave_message_label",
      ),
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "memberLog:ui.modal.set_leave_message_placeholder",
      ),
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
  );

  await interaction.showModal(modal);
}
