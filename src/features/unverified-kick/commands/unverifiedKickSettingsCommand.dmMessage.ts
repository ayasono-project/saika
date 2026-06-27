// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.dmMessage.ts
// unverified-kick-settings のカスタムメッセージ設定サブコマンド（警告 DM / キック予告の設定モーダル・削除）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import { tInteraction } from "../../../shared/locale/localeManager";
import { UNVERIFIED_KICK_DM_MAX_LENGTH } from "../unverifiedKickSettingsDefaults";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "./unverifiedKickSettingsCommand.constants";

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
  await ensureManageGuildPermission(interaction);

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(tInteraction(interaction.locale, titleKey));

  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(tInteraction(interaction.locale, labelKey))
    .setPlaceholder(tInteraction(interaction.locale, placeholderKey))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(UNVERIFIED_KICK_DM_MAX_LENGTH);

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

/**
 * カスタム警告 DM 設定モーダルを表示する。
 */
export async function handleUnverifiedKickSetDmMessage(
  interaction: ChatInputCommandInteraction,
  currentValue?: string,
): Promise<void> {
  await showMessageModal(
    interaction,
    UNVERIFIED_KICK_SETTINGS_COMMAND.SET_DM_MESSAGE_MODAL_ID,
    UNVERIFIED_KICK_SETTINGS_COMMAND.DM_MESSAGE_MODAL_INPUT,
    "unverifiedKick:ui.modal.set_dm_title",
    "unverifiedKick:ui.modal.set_dm_label",
    "unverifiedKick:ui.modal.set_dm_placeholder",
    currentValue,
  );
}

/**
 * カスタム警告 DM を削除する（デフォルト文に戻す）。
 */
export async function handleUnverifiedKickClearDmMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);
  await getBotUnverifiedKickSettingsService().clearDmTemplate(guildId);
  await replyCleared(
    interaction,
    "unverifiedKick:user-response.clear_dm_message_success",
  );
}

/**
 * カスタムキック予告（通知チャンネル）設定モーダルを表示する。
 */
export async function handleUnverifiedKickSetNotifyMessage(
  interaction: ChatInputCommandInteraction,
  currentValue?: string,
): Promise<void> {
  await showMessageModal(
    interaction,
    UNVERIFIED_KICK_SETTINGS_COMMAND.SET_NOTIFY_MESSAGE_MODAL_ID,
    UNVERIFIED_KICK_SETTINGS_COMMAND.NOTIFY_MESSAGE_MODAL_INPUT,
    "unverifiedKick:ui.modal.set_notify_title",
    "unverifiedKick:ui.modal.set_notify_label",
    "unverifiedKick:ui.modal.set_notify_placeholder",
    currentValue,
  );
}

/**
 * カスタムキック予告を削除する（デフォルト文に戻す）。
 */
export async function handleUnverifiedKickClearNotifyMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);
  await getBotUnverifiedKickSettingsService().clearNotifyTemplate(guildId);
  await replyCleared(
    interaction,
    "unverifiedKick:user-response.clear_notify_message_success",
  );
}
