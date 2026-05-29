// src/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsRemoveRole.ts
// vc-recruit-settings remove-role のユースケース処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotVcRecruitSettingsService } from "../../../../bot/services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../bot/shared/disableComponentsAfterTimeout";
import { COMMON_I18N_KEYS } from "../../../../bot/shared/i18nKeys";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  VC_RECRUIT_ROLE_CUSTOM_ID,
  VC_RECRUIT_TIMEOUT,
} from "../vcRecruitSettingsCommand.constants";

/**
 * vc-recruit-settings remove-role を実行する
 * 登録済みロールの StringSelectMenu（複数選択可）をエフェメラルで表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 */
export async function handleVcRecruitSettingsRemoveRole(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const repo = getBotVcRecruitSettingsService();
  const config = await repo.getVcRecruitSettingsOrDefault(guildId);

  if (config.mentionRoleIds.length === 0) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "vcRecruit:user-response.no_roles_registered",
      ),
    );
  }

  const sessionId = interaction.id;

  // 登録済みロールをセレクトメニューのオプションに変換
  const options = config.mentionRoleIds.map((roleId) => {
    const role = interaction.guild?.roles.cache.get(roleId);
    const label = role ? `@${role.name}` : `@${roleId}`;
    return new StringSelectMenuOptionBuilder().setLabel(label).setValue(roleId);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX}${sessionId}`,
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "vcRecruit:ui.select.remove_role_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const confirmButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX}${sessionId}`,
    )
    .setLabel(
      tInteraction(
        interaction.locale,
        "vcRecruit:ui.button.remove_role_confirm",
      ),
    )
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🗑️");

  const cancelButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX}${sessionId}`,
    )
    .setLabel(
      tInteraction(
        interaction.locale,
        "vcRecruit:ui.button.remove_role_cancel",
      ),
    )
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("❌");

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirmButton,
    cancelButton,
  );

  await interaction.reply({
    content: tInteraction(
      interaction.locale,
      "vcRecruit:embed.title.remove_role_select",
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
