// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupButtonModalHandler.ts
// setup フローのボタン設定モーダル送信ハンドラ

import {
  ActionRowBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuBuilder,
} from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  isValidEmoji,
  normalizeEmoji,
  REACTION_ROLE_CUSTOM_ID,
} from "../../commands/reactionRoleCommand.constants";
import { buildColorSelectMenu } from "../../services/reactionRolePanelBuilder";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローのボタン設定モーダルを処理するハンドラ
 * モーダル送信後、色選択 StringSelectMenu を表示する
 */
export const reactionRoleSetupButtonModalHandler: ModalHandler = {
  matches(customId: string) {
    return customId.startsWith(
      REACTION_ROLE_CUSTOM_ID.SETUP_BUTTON_MODAL_PREFIX,
    );
  },

  async execute(interaction: ModalSubmitInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.SETUP_BUTTON_MODAL_PREFIX.length,
    );
    const session = reactionRoleSetupSessions.get(sessionId);
    if (!session) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const label = interaction.fields.getTextInputValue(
      REACTION_ROLE_CUSTOM_ID.BUTTON_LABEL,
    );
    const emoji = normalizeEmoji(
      interaction.fields
        .getTextInputValue(REACTION_ROLE_CUSTOM_ID.BUTTON_EMOJI)
        .trim(),
    );

    // 絵文字のバリデーション
    if (!isValidEmoji(emoji)) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.invalid_emoji",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 前回のエフェメラルメッセージを削除（「もう1つ追加」ループ時）
    if (session.previousReplyInteraction) {
      await session.previousReplyInteraction.deleteReply().catch(() => null);
    }

    // 色選択は SelectMenu で行うため、label / emoji のみ一時保存
    session.pendingButton = { label, emoji, style: "" };

    // 色選択 StringSelectMenu を表示
    const colorSelect = buildColorSelectMenu(
      `${REACTION_ROLE_CUSTOM_ID.SETUP_COLOR_PREFIX}${sessionId}`,
    );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      colorSelect,
    );

    await interaction.reply({
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    // 次のループで削除できるようインタラクションを保存
    session.previousReplyInteraction = interaction;
  },
};
