// src/features/unverified-kick/handlers/ui/unverifiedKickDmMessageModalHandler.ts
// unverified-kick-settings のカスタムメッセージ設定モーダル送信処理（警告 DM / キック予告）

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { getBotUnverifiedKickSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../../shared/locale/i18n";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "../../commands/unverifiedKickSettingsCommand.constants";

/** 設定完了の ephemeral 応答を返す共通ヘルパー */
async function replySuccess(
  interaction: ModalSubmitInteraction,
  descriptionKey: AllParseKeys,
): Promise<void> {
  await interaction.reply({
    embeds: [
      createSuccessEmbed(tInteraction(interaction.locale, descriptionKey), {
        title: tInteraction(interaction.locale, "common:embed.title.success"),
      }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/** 警告 DM メッセージ設定モーダル */
export const unverifiedKickSetDmMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId === UNVERIFIED_KICK_SETTINGS_COMMAND.SET_DM_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      UNVERIFIED_KICK_SETTINGS_COMMAND.DM_MESSAGE_MODAL_INPUT,
    );
    await getBotUnverifiedKickSettingsService().setDmTemplate(
      guild.id,
      message,
    );
    await replySuccess(
      interaction,
      "unverifiedKick:user-response.set_dm_message_success",
    );
  },
};

/** キック予告メッセージ設定モーダル */
export const unverifiedKickSetNotifyMessageModalHandler: ModalHandler = {
  matches(customId) {
    return (
      customId === UNVERIFIED_KICK_SETTINGS_COMMAND.SET_NOTIFY_MESSAGE_MODAL_ID
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const message = interaction.fields.getTextInputValue(
      UNVERIFIED_KICK_SETTINGS_COMMAND.NOTIFY_MESSAGE_MODAL_INPUT,
    );
    await getBotUnverifiedKickSettingsService().setNotifyTemplate(
      guild.id,
      message,
    );
    await replySuccess(
      interaction,
      "unverifiedKick:user-response.set_notify_message_success",
    );
  },
};
