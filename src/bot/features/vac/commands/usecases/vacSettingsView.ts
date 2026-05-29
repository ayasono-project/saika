// src/bot/features/vac/commands/usecases/vacSettingsView.ts
// vac-settings view のユースケース処理

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotVacSettingsService } from "../../../../services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import { createInfoEmbed } from "../../../../utils/messageResponse";
import { presentVacSettingsView } from "../presenters/vacSettingsViewPresenter";

/**
 * vac-settings view を実行する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVacSettingsView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 最新設定を読み込み、表示用の文字列へ整形
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const config =
    await getBotVacSettingsService().getVacSettingsOrDefault(guildId);
  const presentation = await presentVacSettingsView(
    guild,
    interaction.locale,
    config,
  );

  // トリガー一覧と作成済みVC一覧を Embed で返す
  const embed = createInfoEmbed("", {
    title: presentation.title,
    fields: [
      {
        name: presentation.fieldTrigger,
        value: presentation.triggerChannels,
        inline: false,
      },
      {
        name: presentation.fieldCreatedDetails,
        value: presentation.createdVcDetails,
        inline: false,
      },
    ],
  });

  // 設定表示も管理操作のため Ephemeral で返す
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
