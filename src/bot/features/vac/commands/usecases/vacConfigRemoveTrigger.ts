// src/bot/features/vac/commands/usecases/vacConfigRemoveTrigger.ts
// vac-config remove-trigger-vc のユースケース処理（セレクトメニュー複数選択版）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import { getBotVacConfigService } from "../../../../services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import {
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";

/** コレクターのタイムアウト（ms） */
const COLLECTOR_TIMEOUT_MS = 60_000;

const CUSTOM_ID = {
  SELECT: "vac-config:trigger-remove-select",
  CONFIRM: "vac-config:trigger-remove-confirm",
} as const;

/**
 * vac-config remove-trigger-vc を実行する
 * 全トリガーチャンネルをセレクトメニューで表示し、複数選択→削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 */
export async function handleVacConfigRemoveTrigger(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const locale = interaction.locale;
  const service = getBotVacConfigService();
  const config = await service.getVacConfigOrDefault(guildId);

  if (config.triggerChannelIds.length === 0) {
    throw new ValidationError(
      tInteraction(locale, "vac:user-response.not_configured"),
    );
  }

  // トリガーチャンネルの情報を収集
  const triggerInfos: { id: string; label: string }[] = [];
  for (const channelId of config.triggerChannelIds) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    const categoryName =
      channel?.parent?.type === ChannelType.GuildCategory
        ? channel.parent.name
        : tInteraction(locale, "vac:embed.field.value.top");
    const label = `#${channel?.name ?? "CreateVC"} (${categoryName})`;
    triggerInfos.push({ id: channelId, label });
  }

  let selectedIds: string[] = [];

  const buildReplyPayload = () => {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.SELECT)
      .setPlaceholder(
        tInteraction(locale, "vac:ui.select.trigger_remove_placeholder"),
      )
      .setMinValues(1)
      .setMaxValues(triggerInfos.length)
      .addOptions(
        triggerInfos.map((info) => ({
          label: info.label,
          value: info.id,
          default: selectedIds.includes(info.id),
        })),
      );

    const confirmButton = new ButtonBuilder()
      .setCustomId(CUSTOM_ID.CONFIRM)
      .setEmoji("🗑️")
      .setLabel(tInteraction(locale, "vac:ui.button.trigger_remove_confirm"))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(selectedIds.length === 0);

    const embed = createInfoEmbed("", {
      title: tInteraction(locale, "vac:embed.title.config_view"),
      fields: [
        {
          name: tInteraction(locale, "vac:embed.field.name.trigger_channels"),
          value: triggerInfos.map((info) => info.label).join("\n"),
        },
      ],
    });

    return {
      embeds: [embed],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu,
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton),
      ],
    };
  };

  const response = await interaction.reply({
    ...buildReplyPayload(),
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: COLLECTOR_TIMEOUT_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  let handledByCollect = false;

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    // セレクトメニュー
    if (i.customId === CUSTOM_ID.SELECT && i.isStringSelectMenu()) {
      selectedIds = i.values;
      await i.update(buildReplyPayload()).catch(() => {});
      return;
    }

    // 削除実行
    if (i.customId === CUSTOM_ID.CONFIRM) {
      for (const channelId of selectedIds) {
        // DB から削除
        await service.removeTriggerChannel(guildId, channelId);

        // Discord チャンネル実体を削除（エラーは無視）
        const guildChannel = await guild.channels
          .fetch(channelId)
          .catch(() => null);
        if (guildChannel && guildChannel.type === ChannelType.GuildVoice) {
          await guildChannel.delete().catch(() => {});
        }
      }

      const description =
        selectedIds.length === 1
          ? tInteraction(locale, "vac:user-response.trigger_removed", {
              channel:
                triggerInfos.find((t) => t.id === selectedIds[0])?.label ?? "",
            })
          : tInteraction(locale, "vac:user-response.triggers_removed", {
              count: selectedIds.length,
            });

      const embed = createSuccessEmbed(description, {
        title: tInteraction(locale, "common:embed.title.success"),
      });

      await i.update({ embeds: [embed], components: [] });

      for (const channelId of selectedIds) {
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.database_trigger_removed",
            { guildId, channelId },
          ),
        );
      }

      handledByCollect = true;
      collector.stop();
    }
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (handledByCollect) return;
    if (reason === "time") {
      await interaction
        .editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(locale, "common:interaction.timeout"),
              { title: tInteraction(locale, "common:title_timeout") },
            ),
          ],
          components: [],
        })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
