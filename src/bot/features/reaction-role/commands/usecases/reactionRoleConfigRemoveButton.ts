// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton.ts
// リアクションロール remove-button サブコマンド処理

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
import { reactionRoleRemoveButtonSessions } from "../../handlers/ui/reactionRoleSetupState";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_SESSION_TTL_MS,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config remove-button サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigRemoveButton(
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

  // 1件のみならパネル選択をスキップしてボタン選択を直接表示
  if (panels.length === 1) {
    const panel = panels[0];
    const buttons = parseButtons(panel.buttons);

    reactionRoleRemoveButtonSessions.set(sessionId, {
      panelId: panel.id,
      buttonIds: [],
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        `${REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_SELECT_PREFIX}${sessionId}`,
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.button_placeholder",
        ),
      )
      .setMinValues(1)
      .setMaxValues(buttons.length)
      .addOptions(
        buttons.map((btn) => ({
          label: btn.label,
          description: btn.emoji || undefined,
          value: String(btn.buttonId),
        })),
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
    return;
  }

  // 複数パネルの場合はパネル選択を表示
  reactionRoleRemoveButtonSessions.set(sessionId, {
    panelId: "",
    buttonIds: [],
  });

  const guild = interaction.guild;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${REACTION_ROLE_CUSTOM_ID.REMOVE_BUTTON_PANEL_PREFIX}${sessionId}`,
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
