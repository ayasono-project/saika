// src/features/inactive-kick/commands/inactiveKickSettingsCommand.messages.ts
// inactive-kick-settings のカスタムメッセージ系サブコマンド（warn / kick の設定モーダル・削除）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import { tInteraction } from "../../../shared/locale/localeManager";
import { INACTIVE_KICK_MESSAGE_MAX_LENGTH } from "../inactiveKickSettingsDefaults";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/** メッセージ設定モーダルを表示する共通ヘルパー */
async function showMessageModal(
  interaction: ChatInputCommandInteraction,
  modalId: string,
  inputId: string,
  titleKey: AllParseKeys,
  labelKey: AllParseKeys,
  placeholderKey: AllParseKeys,
  currentValue?: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(tInteraction(interaction.locale, titleKey));

  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(tInteraction(interaction.locale, labelKey))
    .setPlaceholder(tInteraction(interaction.locale, placeholderKey))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(INACTIVE_KICK_MESSAGE_MAX_LENGTH);

  if (currentValue) input.setValue(currentValue);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );
  await interaction.showModal(modal);
}

/** 削除完了の ephemeral 応答を返す共通ヘルパー */
async function replyCleared(
  interaction: ChatInputCommandInteraction,
  descriptionKey: AllParseKeys,
): Promise<void> {
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, descriptionKey),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/** 事前通知メッセージ（1週間前）設定モーダルを表示する。 */
export async function handleInactiveKickSetWeekWarnMessage(
  interaction: ChatInputCommandInteraction,
  currentValue?: string,
): Promise<void> {
  await showMessageModal(
    interaction,
    INACTIVE_KICK_SETTINGS_COMMAND.SET_WEEK_WARN_MESSAGE_MODAL_ID,
    INACTIVE_KICK_SETTINGS_COMMAND.WEEK_WARN_MESSAGE_MODAL_INPUT,
    "inactiveKick:ui.modal.set_week_warn_message_title",
    "inactiveKick:ui.modal.set_week_warn_message_label",
    "inactiveKick:ui.modal.set_warn_message_placeholder",
    currentValue,
  );
}

/** 事前通知メッセージ（最終警告）設定モーダルを表示する。 */
export async function handleInactiveKickSetFinalWarnMessage(
  interaction: ChatInputCommandInteraction,
  currentValue?: string,
): Promise<void> {
  await showMessageModal(
    interaction,
    INACTIVE_KICK_SETTINGS_COMMAND.SET_FINAL_WARN_MESSAGE_MODAL_ID,
    INACTIVE_KICK_SETTINGS_COMMAND.FINAL_WARN_MESSAGE_MODAL_INPUT,
    "inactiveKick:ui.modal.set_final_warn_message_title",
    "inactiveKick:ui.modal.set_final_warn_message_label",
    "inactiveKick:ui.modal.set_warn_message_placeholder",
    currentValue,
  );
}

/** キック通知メッセージ設定モーダルを表示する。 */
export async function handleInactiveKickSetKickMessage(
  interaction: ChatInputCommandInteraction,
  currentValue?: string,
): Promise<void> {
  await showMessageModal(
    interaction,
    INACTIVE_KICK_SETTINGS_COMMAND.SET_KICK_MESSAGE_MODAL_ID,
    INACTIVE_KICK_SETTINGS_COMMAND.KICK_MESSAGE_MODAL_INPUT,
    "inactiveKick:ui.modal.set_kick_message_title",
    "inactiveKick:ui.modal.set_kick_message_label",
    "inactiveKick:ui.modal.set_kick_message_placeholder",
    currentValue,
  );
}

/** 事前通知メッセージ（1週間前）を削除する。 */
export async function handleInactiveKickClearWeekWarnMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);
  await getBotInactiveKickSettingsService().clearWeekWarnMessage(guildId);
  await replyCleared(
    interaction,
    "inactiveKick:user-response.clear_week_warn_message_success",
  );
}

/** 事前通知メッセージ（最終警告）を削除する。 */
export async function handleInactiveKickClearFinalWarnMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);
  await getBotInactiveKickSettingsService().clearFinalWarnMessage(guildId);
  await replyCleared(
    interaction,
    "inactiveKick:user-response.clear_final_warn_message_success",
  );
}

/** キック通知メッセージを削除する。 */
export async function handleInactiveKickClearKickMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);
  await getBotInactiveKickSettingsService().clearKickMessage(guildId);
  await replyCleared(
    interaction,
    "inactiveKick:user-response.clear_kick_message_success",
  );
}
