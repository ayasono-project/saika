// src/bot/features/vc-recruit/commands/usecases/vcRecruitConfigAddRole.ts
// vc-recruit-config add-role のユースケース処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  RoleSelectMenuBuilder,
} from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import {
  DISCORD_SELECT_MAX_OPTIONS,
  VC_RECRUIT_ROLE_CUSTOM_ID,
  VC_RECRUIT_TIMEOUT,
} from "../vcRecruitConfigCommand.constants";

/**
 * vc-recruit-config add-role を実行する
 * RoleSelectMenu（複数選択可）をエフェメラルで表示する
 * @param interaction コマンド実行インタラクション
 */
export async function handleVcRecruitConfigAddRole(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const sessionId = interaction.id;

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX}${sessionId}`,
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "vcRecruit:ui.select.add_role_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(DISCORD_SELECT_MAX_OPTIONS);

  const confirmButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX}${sessionId}`,
    )
    .setLabel(
      tInteraction(interaction.locale, "vcRecruit:ui.button.add_role_confirm"),
    )
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const cancelButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX}${sessionId}`,
    )
    .setLabel(
      tInteraction(interaction.locale, "vcRecruit:ui.button.add_role_cancel"),
    )
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("❌");

  const selectRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    roleSelect,
  );
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirmButton,
    cancelButton,
  );

  await interaction.reply({
    content: tInteraction(
      interaction.locale,
      "vcRecruit:embed.title.add_role_select",
    ),
    components: [selectRow, buttonRow],
    flags: MessageFlags.Ephemeral,
  });

  disableComponentsAfterTimeout(
    interaction,
    [selectRow, buttonRow],
    VC_RECRUIT_TIMEOUT.ROLE_SELECT_TIMEOUT_MS,
  );
}
