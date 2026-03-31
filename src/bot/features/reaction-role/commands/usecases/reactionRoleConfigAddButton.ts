// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigAddButton.ts
// リアクションロール add-button サブコマンド処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import { reactionRoleAddButtonSessions } from "../../handlers/ui/reactionRoleSetupState";
import { buildButtonSettingsModal } from "../../services/reactionRolePanelBuilder";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_MAX_BUTTONS,
  REACTION_ROLE_SESSION_TTL_MS,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config add-button サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigAddButton(
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

  // 1件のみならスキップ
  if (panels.length === 1) {
    const panel = panels[0];
    const existingButtons = parseButtons(panel.buttons);

    if (existingButtons.length >= REACTION_ROLE_MAX_BUTTONS) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.button_limit_reached",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    reactionRoleAddButtonSessions.set(sessionId, {
      panelId: panel.id,
      buttons: [],
      buttonCounter: panel.buttonCounter,
    });

    // ボタン設定モーダルを表示
    const modal = buildButtonSettingsModal(
      REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_MODAL_PREFIX,
      sessionId,
      interaction.locale,
    );
    await interaction.showModal(modal);
    return;
  }

  // 複数パネルの場合はセレクトメニュー表示
  reactionRoleAddButtonSessions.set(sessionId, {
    panelId: "",
    buttons: [],
    buttonCounter: 0,
    commandInteraction: interaction,
  });

  const guild = interaction.guild;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${REACTION_ROLE_CUSTOM_ID.ADD_BUTTON_SELECT_PREFIX}${sessionId}`,
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
