// src/bot/features/vc-recruit/commands/usecases/vcRecruitConfigView.ts
// vc-recruit-config view のユースケース処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotVcRecruitRepository } from "../../../../services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import { createInfoEmbed } from "../../../../utils/messageResponse";

/**
 * vc-recruit-config view を実行する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 */
export async function handleVcRecruitConfigView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const config =
    await getBotVcRecruitRepository().getVcRecruitConfigOrDefault(guildId);

  // ── セットアップ一覧を整形 ──────────────────────────────────────
  let setupsValue: string;
  if (config.setups.length === 0) {
    setupsValue = tInteraction(
      interaction.locale,
      "vcRecruit:embed.field.value.no_setups",
    );
  } else {
    const lines = config.setups.map((s) => {
      const categoryName = s.categoryId
        ? (guild.channels.cache.get(s.categoryId)?.name ?? s.categoryId)
        : tInteraction(interaction.locale, "vcRecruit:embed.field.value.top");
      return tInteraction(
        interaction.locale,
        "vcRecruit:embed.field.value.setup_item",
        {
          category: categoryName,
          panel: `<#${s.panelChannelId}>`,
          post: `<#${s.postChannelId}>`,
        },
      );
    });
    setupsValue = lines.join("\n");
  }

  // ── メンションロール一覧を整形 ──────────────────────────────────
  let rolesValue: string;
  if (config.mentionRoleIds.length === 0) {
    rolesValue = tInteraction(
      interaction.locale,
      "vcRecruit:embed.field.value.no_roles",
    );
  } else {
    rolesValue = config.mentionRoleIds.map((id) => `<@&${id}>`).join(", ");
  }

  const fieldSetups = tInteraction(
    interaction.locale,
    "vcRecruit:embed.field.name.setups",
  );
  const fieldRoles = tInteraction(
    interaction.locale,
    "vcRecruit:embed.field.name.roles",
  );
  const viewTitle = tInteraction(
    interaction.locale,
    "vcRecruit:embed.title.config_view",
  );

  const embed = createInfoEmbed("", {
    title: viewTitle,
    fields: [
      { name: fieldSetups, value: setupsValue, inline: false },
      { name: fieldRoles, value: rolesValue, inline: false },
    ],
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
