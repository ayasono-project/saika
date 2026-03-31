// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup.ts
// リアクションロール setup サブコマンド処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import { reactionRoleSetupSessions } from "../../handlers/ui/reactionRoleSetupState";
import {
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_PANEL_COLOR,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config setup サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigSetup(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  logger.info(
    logPrefixed(
      "system:log_prefix.reaction_role",
      "reactionRole:log.setup_started",
      { guildId },
    ),
  );

  // セッションを生成して保存（モーダル表示前にセッションIDが必要）
  const sessionId = crypto.randomUUID();
  reactionRoleSetupSessions.set(sessionId, {
    title: "",
    description: "",
    color: REACTION_ROLE_DEFAULT_PANEL_COLOR,
    mode: "",
    buttons: [],
    buttonCounter: 0,
  });

  // パネル設定モーダルを表示
  const modal = new ModalBuilder()
    .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_PREFIX}${sessionId}`)
    .setTitle(
      tInteraction(interaction.locale, "reactionRole:ui.modal.setup_title"),
    )
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_TITLE)
          .setLabel(
            tInteraction(
              interaction.locale,
              "reactionRole:ui.modal.setup_field_title",
            ),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(
            tInteraction(
              interaction.locale,
              "reactionRole:embed.title.panel_default",
            ),
          ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_DESCRIPTION)
          .setLabel(
            tInteraction(
              interaction.locale,
              "reactionRole:ui.modal.setup_field_description",
            ),
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(
            tInteraction(
              interaction.locale,
              "reactionRole:embed.description.panel_default",
            ),
          ),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.SETUP_MODAL_COLOR)
          .setLabel(
            tInteraction(
              interaction.locale,
              "reactionRole:ui.modal.setup_field_color",
            ),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(REACTION_ROLE_DEFAULT_PANEL_COLOR),
      ),
    );

  await interaction.showModal(modal);
}
