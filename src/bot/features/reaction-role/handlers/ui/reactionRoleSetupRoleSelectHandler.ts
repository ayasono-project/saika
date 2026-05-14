// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupRoleSelectHandler.ts
// setup フローのロール選択ハンドラ（ボタン追加ループ）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
  MessageFlags,
  type RoleSelectMenuInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { RoleSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { createErrorEmbed } from "../../../../utils/messageResponse";
import {
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_MAX_BUTTONS,
} from "../../commands/reactionRoleCommand.constants";
import { validateSelectedRolesHierarchy } from "../../services/reactionRolePanelBuilder";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローのロール選択メニューを処理するハンドラ
 * ロール選択後、「もう1つ追加」「完了」ボタンを表示する
 */
export const reactionRoleSetupRoleSelectHandler: RoleSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_ROLES_PREFIX);
  },

  async execute(interaction: RoleSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.SETUP_ROLES_PREFIX.length,
    );
    const session = reactionRoleSetupSessions.get(sessionId);
    if (!session || !session.pendingButton) {
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

    // ロールIDを取得
    const roleIds = Array.from(interaction.roles.keys());

    // ロール階層バリデーション（Bot 最上位以上 or 実行者最上位以上を拒否）
    const guild = interaction.guild;
    const member = interaction.member as GuildMember | null;
    if (guild && member) {
      const invalid = validateSelectedRolesHierarchy(guild, member, roleIds);
      if (invalid.length > 0) {
        const roleMentions = invalid.map((r) => `<@&${r.id}>`).join(", ");
        const embed = createErrorEmbed(
          tInteraction(
            interaction.locale,
            "reactionRole:user-response.role_above_hierarchy",
            { roles: roleMentions },
          ),
          { locale: interaction.locale },
        );
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    session.buttonCounter++;
    session.buttons.push({
      buttonId: session.buttonCounter,
      label: session.pendingButton.label,
      emoji: session.pendingButton.emoji,
      style: session.pendingButton.style,
      roleIds,
    });
    session.pendingButton = undefined;

    const atLimit = session.buttons.length >= REACTION_ROLE_MAX_BUTTONS;

    // 「もう1つ追加」「完了」ボタンを表示
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_ADD_PREFIX}${sessionId}`)
        .setEmoji("➕")
        .setLabel(
          tInteraction(interaction.locale, "reactionRole:ui.button.setup_add"),
        )
        .setStyle(ButtonStyle.Primary)
        .setDisabled(atLimit),
      new ButtonBuilder()
        .setCustomId(`${REACTION_ROLE_CUSTOM_ID.SETUP_DONE_PREFIX}${sessionId}`)
        .setEmoji("✅")
        .setLabel(
          tInteraction(interaction.locale, "reactionRole:ui.button.setup_done"),
        )
        .setStyle(ButtonStyle.Success),
    );

    await interaction.update({
      components: [row],
    });
  },
};
