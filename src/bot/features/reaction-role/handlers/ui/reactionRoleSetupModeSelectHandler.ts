// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupModeSelectHandler.ts
// setup フローのモード選択ハンドラ

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import { REACTION_ROLE_CUSTOM_ID } from "../../commands/reactionRoleCommand.constants";
import { buildButtonSettingsModal } from "../../services/reactionRolePanelBuilder";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローのモード選択メニューを処理するハンドラ
 * モード選択後、ボタン設定モーダルを表示する
 */
export const reactionRoleSetupModeSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_MODE_PREFIX);
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.SETUP_MODE_PREFIX.length,
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

    // モードをセッションに保存
    session.mode = interaction.values[0];

    // ボタン設定モーダルを表示
    const modal = buildButtonSettingsModal(
      REACTION_ROLE_CUSTOM_ID.SETUP_BUTTON_MODAL_PREFIX,
      sessionId,
      interaction.locale,
    );

    await interaction.showModal(modal);

    // モード選択メッセージを削除
    await interaction.deleteReply().catch(() => null);
  },
};
