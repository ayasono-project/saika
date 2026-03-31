// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.reset.ts
// bump-reminder-config reset 実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { createDefaultBumpReminderConfig } from "../../../../shared/features/bump-reminder/bumpReminderConfigDefaults";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import {
  getBotBumpReminderConfigService,
  getBotBumpReminderManager,
} from "../../../services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../utils/messageResponse";

/** 確認ダイアログのタイムアウト（ms） */
const RESET_CONFIRM_TIMEOUT_MS = 60_000;

const CUSTOM_ID = {
  CONFIRM: "bump-reminder:reset-confirm",
  CANCEL: "bump-reminder:reset-cancel",
} as const;

/**
 * Bumpリマインダー設定をリセットする
 * 確認ダイアログを表示し、確認後にデフォルト状態に戻す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 */
export async function handleBumpReminderConfigReset(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;

  // 確認ダイアログを表示
  const confirmEmbed = createWarningEmbed(
    tInteraction(locale, "bumpReminder:embed.description.reset_confirm"),
    {
      title: tInteraction(locale, "bumpReminder:embed.title.reset_confirm"),
      fields: [
        {
          name: tInteraction(
            locale,
            "bumpReminder:embed.field.name.reset_target",
          ),
          value: tInteraction(
            locale,
            "bumpReminder:embed.field.value.reset_target",
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
      // リセット実行
      const configService = getBotBumpReminderConfigService();
      await configService.saveBumpReminderConfig(
        guildId,
        createDefaultBumpReminderConfig(),
      );

      // メモリ上のタイマーをキャンセル
      await getBotBumpReminderManager().cancelReminder(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "bumpReminder:user-response.reset_success"),
        {
          title: tInteraction(locale, "common:embed.title.success"),
        },
      );

      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.config_reset",
          { guildId },
        ),
      );
    } else if (i.customId === CUSTOM_ID.CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "bumpReminder:user-response.reset_cancelled"),
        {
          title: tInteraction(locale, "common:embed.title.success"),
        },
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
        tInteraction(locale, "bumpReminder:user-response.reset_cancelled"),
        {
          title: tInteraction(locale, "common:embed.title.success"),
        },
      );

      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
