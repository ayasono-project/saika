// src/features/inactive-kick/commands/inactiveKickSettingsCommand.activity.ts
// inactive-kick-settings activity グループのハンドラ（トリガー一括設定）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";
import {
  INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS,
  INACTIVE_KICK_SETTINGS_COMMAND,
} from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/**
 * activity set サブコマンドのハンドラ。
 * 現在の設定を読み込み、multi-select メニューで有効トリガーを一括設定する。
 */
export async function handleInactiveKickActivitySet(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const locale = interaction.locale;
  const service = getBotInactiveKickSettingsService();
  const settings = await service.getSettingsOrDefault(guildId);

  const { ACTIVITY_TRIGGER, ACTIVITY_SET_SELECT_ID } =
    INACTIVE_KICK_SETTINGS_COMMAND;

  const select = new StringSelectMenuBuilder()
    .setCustomId(ACTIVITY_SET_SELECT_ID)
    .setPlaceholder(
      tInteraction(locale, "inactiveKick:ui.select.activity_set_placeholder"),
    )
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(tInteraction(locale, "inactiveKick:activity_trigger.message"))
        .setValue(ACTIVITY_TRIGGER.MESSAGE)
        .setDefault(settings.trackMessage),
      new StringSelectMenuOptionBuilder()
        .setLabel(tInteraction(locale, "inactiveKick:activity_trigger.voice"))
        .setValue(ACTIVITY_TRIGGER.VOICE)
        .setDefault(settings.trackVoice),
      new StringSelectMenuOptionBuilder()
        .setLabel(
          tInteraction(locale, "inactiveKick:activity_trigger.reaction"),
        )
        .setValue(ACTIVITY_TRIGGER.REACTION)
        .setDefault(settings.trackReaction),
    );

  const response = await interaction.reply({
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    if (!i.isStringSelectMenu()) return;
    const selected = i.values;
    await service.setActivityTriggers(guildId, {
      trackMessage: selected.includes(ACTIVITY_TRIGGER.MESSAGE),
      trackVoice: selected.includes(ACTIVITY_TRIGGER.VOICE),
      trackReaction: selected.includes(ACTIVITY_TRIGGER.REACTION),
    });
    const allTriggers = [
      ACTIVITY_TRIGGER.MESSAGE,
      ACTIVITY_TRIGGER.VOICE,
      ACTIVITY_TRIGGER.REACTION,
    ] as const;
    const toLabel = (v: string) =>
      tInteraction(
        locale,
        `inactiveKick:activity_trigger.${v}` as Parameters<
          typeof tInteraction
        >[1],
      );
    const enabledLabels = selected.map(toLabel).join(", ");
    const disabledList = allTriggers
      .filter((v) => !selected.includes(v))
      .map(toLabel);
    const body =
      disabledList.length > 0
        ? tInteraction(
            locale,
            "inactiveKick:user-response.activity_set_success",
            { enabled: enabledLabels, disabled: disabledList.join(", ") },
          )
        : tInteraction(
            locale,
            "inactiveKick:user-response.activity_set_all_enabled",
            { enabled: enabledLabels },
          );
    await i.update({
      embeds: [
        createSuccessEmbed(body, {
          title: tInteraction(locale, "common:embed.title.success"),
        }),
      ],
      components: [],
    });
    collector.stop();
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction.editReply({ components: [] }).catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
