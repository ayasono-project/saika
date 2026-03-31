// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel.ts
// リアクションロール edit-panel サブコマンド処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import { reactionRoleEditPanelSessions } from "../../handlers/ui/reactionRoleSetupState";
import {
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_SESSION_TTL_MS,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config edit-panel サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigEditPanel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const configService = getBotReactionRolePanelConfigService();
  const panels = await configService.findAllByGuild(guildId);

  if (panels.length === 0) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "reactionRole:user-response.no_panels"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sessionId = crypto.randomUUID();

  // 1件のみならスキップしてモーダルを直接表示
  if (panels.length === 1) {
    const panel = panels[0];
    reactionRoleEditPanelSessions.set(sessionId, {
      panelId: panel.id,
    });

    const modal = buildEditPanelModal(
      sessionId,
      panel.title,
      panel.description,
      panel.color,
      interaction.locale,
    );
    await interaction.showModal(modal);
    return;
  }

  // 複数パネルの場合はセレクトメニュー表示
  reactionRoleEditPanelSessions.set(sessionId, {
    panelId: "",
    commandInteraction: interaction,
  });

  const guild = interaction.guild;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_SELECT_PREFIX}${sessionId}`,
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "reactionRole:ui.select.panel_placeholder",
      ),
    )
    .addOptions(
      panels.map((panel) => {
        const channelName =
          guild?.channels.cache.get(panel.channelId)?.name ?? panel.channelId;
        return {
          label: panel.title,
          description: `#${channelName}`,
          value: panel.id,
        };
      }),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );

  await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  disableComponentsAfterTimeout(
    interaction,
    [row],
    REACTION_ROLE_SESSION_TTL_MS,
  );
}

/**
 * edit-panel モーダルを構築する
 * @param sessionId セッション識別子
 * @param currentTitle 現在のパネルタイトル
 * @param currentDescription 現在のパネル説明文
 * @param currentColor 現在のカラーコード
 * @param locale ユーザーのロケール
 * @returns 構築されたModalBuilder
 */
export function buildEditPanelModal(
  sessionId: string,
  currentTitle: string,
  currentDescription: string,
  currentColor: string,
  locale: string,
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(
      `${REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_MODAL_PREFIX}${sessionId}`,
    )
    .setTitle(tInteraction(locale, "reactionRole:ui.modal.edit_panel_title"))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_TITLE)
          .setLabel(
            tInteraction(locale, "reactionRole:ui.modal.setup_field_title"),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(currentTitle),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_DESCRIPTION)
          .setLabel(
            tInteraction(
              locale,
              "reactionRole:ui.modal.setup_field_description",
            ),
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(currentDescription),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.EDIT_PANEL_COLOR)
          .setLabel(
            tInteraction(locale, "reactionRole:ui.modal.setup_field_color"),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(currentColor),
      ),
    );
}
