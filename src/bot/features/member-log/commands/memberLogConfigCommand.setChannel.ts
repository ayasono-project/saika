// src/bot/features/member-log/commands/memberLogConfigCommand.setChannel.ts
// member-log-config set-channel 実行処理

import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotMemberLogConfigService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";
import { MEMBER_LOG_CONFIG_COMMAND } from "./memberLogConfigCommand.constants";
import { ensureMemberLogManageGuildPermission } from "./memberLogConfigCommand.guard";

/**
 * 通知チャンネルを設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // チャンネルオプションを取得
  const channel = interaction.options.getChannel(
    MEMBER_LOG_CONFIG_COMMAND.OPTION.CHANNEL,
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
  await getBotMemberLogConfigService().setChannelId(guildId, channel.id);

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
