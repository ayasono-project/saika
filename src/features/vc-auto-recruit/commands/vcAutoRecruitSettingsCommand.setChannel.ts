// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.setChannel.ts
// vc-auto-recruit-settings set-channel 実行処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * 投稿先（通知）チャンネルを設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // チャンネルオプションを取得
  const channel = interaction.options.getChannel(
    VC_AUTO_RECRUIT_SETTINGS_COMMAND.OPTION.CHANNEL,
    true,
  );

  // テキストチャンネル以外は拒否
  if (channel.type !== ChannelType.GuildText) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "vcAutoRecruit:user-response.text_channel_only",
      ),
    );
  }

  // 投稿先チャンネルを保存
  await getBotVcAutoRecruitSettingsService().setChannelId(guildId, channel.id);

  const description = tInteraction(
    interaction.locale,
    "vcAutoRecruit:user-response.set_channel_success",
    { channel: `<#${channel.id}>` },
  );
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  await interaction.reply({
    embeds: [createSuccessEmbed(description, { title: successTitle })],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.vc_auto_recruit",
      "vcAutoRecruit:log.config_set_channel",
      { guildId, channelId: channel.id },
    ),
  );
}
