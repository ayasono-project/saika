// AFK機能のコマンド

import {
  ChannelType,
  ChatInputCommandInteraction,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { executeAfkCommand } from "../../features/afk/commands/afkCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

// AFK コマンド本体で利用するコマンド名・オプション名定数
const AFK_COMMAND = {
  NAME: "afk",
  OPTION: {
    TARGET_MEMBER: "target-member",
    TARGET_CHANNEL: "target-channel",
  },
} as const;

const AFK_I18N_KEYS = {
  COMMAND_DESCRIPTION: "afk.description",
  TARGET_MEMBER_OPTION_DESCRIPTION: "afk.target-member.description",
  TARGET_CHANNEL_OPTION_DESCRIPTION: "afk.target-channel.description",
} as const;

/**
 * AFKコマンド（他メンバー / VC全員のAFKチャンネルへの移動）
 *
 * 他メンバーを動かす操作のみを提供するため、既定の実行権限を MoveMembers に絞る。
 * コード側での権限再チェックは行わない（管理者が連携サービス設定でロールへ委任できる余地を残すため）。
 */
export const afkCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    const targetMemberDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.TARGET_MEMBER_OPTION_DESCRIPTION,
    );
    const targetChannelDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.TARGET_CHANNEL_OPTION_DESCRIPTION,
    );

    return createSlashCommand()
      .setName(AFK_COMMAND.NAME)
      .setDescription(cmdDesc.base)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
      .addUserOption((option) =>
        option
          .setName(AFK_COMMAND.OPTION.TARGET_MEMBER)
          .setDescription(targetMemberDesc.base)
          .setDescriptionLocalizations(targetMemberDesc.localizations)
          .setRequired(false),
      )
      .addChannelOption((option) =>
        option
          .setName(AFK_COMMAND.OPTION.TARGET_CHANNEL)
          .setDescription(targetChannelDesc.base)
          .setDescriptionLocalizations(targetChannelDesc.localizations)
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false),
      );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeAfkCommand(interaction);
    } catch (error) {
      // 統一エラーハンドリング
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default afkCommand;
