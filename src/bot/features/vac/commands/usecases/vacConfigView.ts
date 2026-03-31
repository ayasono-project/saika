// src/bot/features/vac/commands/usecases/vacConfigView.ts
// vac-config view のユースケース処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { getBotVacConfigService } from "../../../../services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import { createInfoEmbed } from "../../../../utils/messageResponse";
import { presentVacConfigView } from "../presenters/vacConfigViewPresenter";

/**
 * vac-config view を実行する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVacConfigView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 最新設定を読み込み、表示用の文字列へ整形
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const config = await getBotVacConfigService().getVacConfigOrDefault(guildId);
  const presentation = await presentVacConfigView(
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
