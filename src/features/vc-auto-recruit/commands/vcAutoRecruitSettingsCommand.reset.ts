// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.reset.ts
// vc-auto-recruit-settings reset 実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/** 確認ダイアログのタイムアウト（ms） */
const RESET_CONFIRM_TIMEOUT_MS = 60_000;

const CUSTOM_ID = {
  CONFIRM: "vc-auto-recruit-settings:reset-confirm",
  CANCEL: "vc-auto-recruit-settings:reset-cancel",
} as const;

/**
 * VC自動募集設定をリセットする
 * 確認ダイアログを表示し、確認後にデフォルト状態に戻す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsReset(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;

  // 確認ダイアログを表示
  const confirmEmbed = createWarningEmbed(
    tInteraction(locale, "vcAutoRecruit:embed.description.reset_confirm"),
    {
      title: tInteraction(locale, "vcAutoRecruit:embed.title.reset_confirm"),
      fields: [
        {
          name: tInteraction(
            locale,
            "vcAutoRecruit:embed.field.name.reset_target",
          ),
          value: tInteraction(
            locale,
            "vcAutoRecruit:embed.field.value.reset_target",
          ),
        },
      ],
    },
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID.CONFIRM)
      .setEmoji("🗑️")
      .setLabel(tInteraction(locale, "common:ui.button.reset_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID.CANCEL)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "common:ui.button.reset_cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // ボタン応答を待機
  const collector = response.createMessageComponentCollector({
    time: RESET_CONFIRM_TIMEOUT_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (i.customId === CUSTOM_ID.CONFIRM) {
      // デフォルト設定で上書き（全フィールド・追跡中の募集もリセット）
      await getBotVcAutoRecruitSettingsService().resetToDefault(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "vcAutoRecruit:user-response.reset_success"),
        { title: tInteraction(locale, "common:embed.title.success") },
      );
      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.config_reset",
          { guildId },
        ),
      );
    } else if (i.customId === CUSTOM_ID.CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "vcAutoRecruit:user-response.reset_cancelled"),
        { title: tInteraction(locale, "common:embed.title.success") },
      );
      await i.update({ embeds: [cancelEmbed], components: [] });
    }

    collector.stop();
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "vcAutoRecruit:user-response.reset_cancelled"),
        { title: tInteraction(locale, "common:embed.title.success") },
      );
      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
