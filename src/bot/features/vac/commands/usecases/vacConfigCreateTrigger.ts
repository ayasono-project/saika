// src/bot/features/vac/commands/usecases/vacConfigCreateTrigger.ts
// vac-config create-trigger-vc のユースケース処理

import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotVacConfigService } from "../../../../services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import { createSuccessEmbed } from "../../../../utils/messageResponse";
import {
  findTriggerChannelByCategory,
  resolveTargetCategory,
} from "../helpers/vacConfigTargetResolver";
import { VAC_CONFIG_COMMAND } from "../vacConfigCommand.constants";

/**
 * vac-config create-trigger-vc を実行する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVacConfigCreateTrigger(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行コンテキストから対象カテゴリを解決
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const categoryOption = interaction.options.getString(
    VAC_CONFIG_COMMAND.OPTION.CATEGORY,
  );
  const category = await resolveTargetCategory(
    guild,
    interaction.channelId,
    categoryOption,
  );
  const targetCategoryId = category?.id ?? null;

  const repo = getBotVacConfigService();

  const config = await repo.getVacConfigOrDefault(guildId);
  // 同一カテゴリへの重複トリガー作成を防止
  const existingTrigger = await findTriggerChannelByCategory(
    guild,
    config.triggerChannelIds,
    targetCategoryId,
  );
  if (existingTrigger) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vac:user-response.already_exists"),
    );
  }

  // カテゴリ上限に達している場合は作成を中止
  if (
    category &&
    category.children.cache.size >= VAC_CONFIG_COMMAND.CATEGORY_CHANNEL_LIMIT
  ) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vac:user-response.category_full"),
    );
  }

  // 実チャンネル作成後に設定へ反映して整合を保つ
  const triggerChannel = await guild.channels.create({
    name: VAC_CONFIG_COMMAND.TRIGGER_CHANNEL_NAME,
    type: ChannelType.GuildVoice,
    parent: category?.id ?? null,
  });

  // 作成したトリガーVCを設定へ反映して永続化する
  await repo.addTriggerChannel(guildId, triggerChannel.id);

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "vac:user-response.trigger_created", {
      channel: `<#${triggerChannel.id}>`,
    }),
    {
      title: tInteraction(interaction.locale, "common:embed.title.success"),
    },
  );
  // 管理系操作の結果は Ephemeral で返してチャンネルノイズを抑える
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
