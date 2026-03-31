// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupButtonModalHandler.ts
// setup フローのボタン設定モーダル送信ハンドラ

import {
  ActionRowBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  RoleSelectMenuBuilder,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  isValidButtonStyle,
  isValidEmoji,
  normalizeEmoji,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_BUTTON_STYLE,
  REACTION_ROLE_MAX_ROLE_SELECT,
} from "../../commands/reactionRoleCommand.constants";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローのボタン設定モーダルを処理するハンドラ
 * モーダル送信後、RoleSelectMenu を表示する
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
    const styleInput = interaction.fields
      .getTextInputValue(REACTION_ROLE_CUSTOM_ID.BUTTON_STYLE)
      .trim()
      .toLowerCase();
    const style = styleInput || REACTION_ROLE_DEFAULT_BUTTON_STYLE;

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

    // スタイルのバリデーション
    if (!isValidButtonStyle(style)) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.invalid_style",
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

    // 一時的にボタン情報を保存（ロール選択後に確定）
    session.pendingButton = { label, emoji, style };

    // RoleSelectMenu を表示
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_ROLES_PREFIX}${sessionId}`)
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.roles_placeholder",
        ),
      )
      .setMinValues(1)
      .setMaxValues(REACTION_ROLE_MAX_ROLE_SELECT);

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      roleSelect,
    );

    await interaction.reply({
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    // 次のループで削除できるようインタラクションを保存
    session.previousReplyInteraction = interaction;
  },
};
