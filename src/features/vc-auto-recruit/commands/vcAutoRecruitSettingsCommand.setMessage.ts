// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.setMessage.ts
// vc-auto-recruit-settings set-message 実行処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../shared/locale/localeManager";
import { VC_AUTO_RECRUIT_MESSAGE_MAX_LENGTH } from "../constants/vcAutoRecruit.constants";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * カスタム募集メッセージ設定モーダルを表示する
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsSetMessage(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  const modal = new ModalBuilder()
    .setCustomId(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SET_MESSAGE_MODAL_ID)
    .setTitle(
      tInteraction(
        interaction.locale,
        "vcAutoRecruit:ui.modal.set_message_title",
      ),
    );

  const messageInput = new TextInputBuilder()
    .setCustomId(VC_AUTO_RECRUIT_SETTINGS_COMMAND.MODAL_INPUT_MESSAGE)
    .setLabel(
      tInteraction(
        interaction.locale,
        "vcAutoRecruit:ui.modal.set_message_label",
      ),
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "vcAutoRecruit:ui.modal.set_message_placeholder",
      ),
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(VC_AUTO_RECRUIT_MESSAGE_MAX_LENGTH);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
  );

  await interaction.showModal(modal);
}
