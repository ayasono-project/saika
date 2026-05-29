// src/bot/features/member-log/commands/memberLogSettingsCommand.setChannel.ts
// member-log-settings set-channel 実行処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getBotMemberLogSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { MEMBER_LOG_SETTINGS_COMMAND } from "./memberLogSettingsCommand.constants";
import { ensureMemberLogManageGuildPermission } from "./memberLogSettingsCommand.guard";

/**
 * 通知チャンネルを設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogSettingsSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // チャンネルオプションを取得
  const channel = interaction.options.getChannel(
    MEMBER_LOG_SETTINGS_COMMAND.OPTION.CHANNEL,
    true,
  );

  // テキストチャンネル以外は拒否
  if (channel.type !== ChannelType.GuildText) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "memberLog:user-response.text_channel_only",
      ),
    );
  }

  // 通知チャンネルを保存
  await getBotMemberLogSettingsService().setChannelId(guildId, channel.id);

  const description = tInteraction(
    interaction.locale,
    "memberLog:user-response.set_channel_success",
    { channel: `<#${channel.id}>` },
  );
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  const embed = createSuccessEmbed(description, { title: successTitle });
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.member_log",
      "memberLog:log.config_set_channel",
      {
        guildId,
        channelId: channel.id,
      },
    ),
  );
}
