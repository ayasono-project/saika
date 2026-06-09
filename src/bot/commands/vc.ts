// src/bot/commands/vc.ts
// VC操作コマンド定義

import {
  ChannelType,
  type ChatInputCommandInteraction,
  InteractionContextType,
} from "discord.js";
import { VC_COMMAND } from "../../features/vc-command/commands/vcCommand.constants";
import { executeVcCommand } from "../../features/vc-command/commands/vcCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

/**
 * VC操作コマンド
 * Bot管理下VCのリネーム・人数制限変更、および任意メンバー/VCの切断・移動を提供する
 */
export const vcCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations("vc", "vc.description");
    const renameDesc = getCommandLocalizations("vc", "vc.rename.description");
    const renameNameDesc = getCommandLocalizations(
      "vc",
      "vc.rename.name.description",
    );
    const limitDesc = getCommandLocalizations("vc", "vc.limit.description");
    const limitValueDesc = getCommandLocalizations(
      "vc",
      "vc.limit.limit.description",
    );
    const disconnectDesc = getCommandLocalizations(
      "vc",
      "vc.disconnect.description",
    );
    const disconnectMemberDesc = getCommandLocalizations(
      "vc",
      "vc.disconnect.target-member.description",
    );
    const disconnectChannelDesc = getCommandLocalizations(
      "vc",
      "vc.disconnect.target-channel.description",
    );
    const disconnectReasonDesc = getCommandLocalizations(
      "vc",
      "vc.disconnect.reason.description",
    );
    const moveDesc = getCommandLocalizations("vc", "vc.move.description");
    const moveMemberDesc = getCommandLocalizations(
      "vc",
      "vc.move.target-member.description",
    );
    const moveChannelDesc = getCommandLocalizations(
      "vc",
      "vc.move.target-channel.description",
    );
    const moveToDesc = getCommandLocalizations("vc", "vc.move.to.description");
    const moveReasonDesc = getCommandLocalizations(
      "vc",
      "vc.move.reason.description",
    );

    return createSlashCommand()
      .setName(VC_COMMAND.NAME)
      .setDescription(cmdDesc.base)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setContexts(InteractionContextType.Guild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.RENAME)
          .setDescription(renameDesc.base)
          .setDescriptionLocalizations(renameDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.NAME)
              .setDescription(renameNameDesc.base)
              .setDescriptionLocalizations(renameNameDesc.localizations)
              .setRequired(true)
              .setMaxLength(100),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.LIMIT)
          .setDescription(limitDesc.base)
          .setDescriptionLocalizations(limitDesc.localizations)
          .addIntegerOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.LIMIT)
              .setDescription(limitValueDesc.base)
              .setDescriptionLocalizations(limitValueDesc.localizations)
              .setRequired(true)
              .setMinValue(VC_COMMAND.LIMIT_MIN)
              .setMaxValue(VC_COMMAND.LIMIT_MAX),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.DISCONNECT)
          .setDescription(disconnectDesc.base)
          .setDescriptionLocalizations(disconnectDesc.localizations)
          .addUserOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.TARGET_MEMBER)
              .setDescription(disconnectMemberDesc.base)
              .setDescriptionLocalizations(disconnectMemberDesc.localizations)
              .setRequired(false),
          )
          .addChannelOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.TARGET_CHANNEL)
              .setDescription(disconnectChannelDesc.base)
              .setDescriptionLocalizations(disconnectChannelDesc.localizations)
              .addChannelTypes(ChannelType.GuildVoice)
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.REASON)
              .setDescription(disconnectReasonDesc.base)
              .setDescriptionLocalizations(disconnectReasonDesc.localizations)
              .setRequired(false),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.MOVE)
          .setDescription(moveDesc.base)
          .setDescriptionLocalizations(moveDesc.localizations)
          .addChannelOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.TO)
              .setDescription(moveToDesc.base)
              .setDescriptionLocalizations(moveToDesc.localizations)
              .addChannelTypes(ChannelType.GuildVoice)
              .setRequired(true),
          )
          .addUserOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.TARGET_MEMBER)
              .setDescription(moveMemberDesc.base)
              .setDescriptionLocalizations(moveMemberDesc.localizations)
              .setRequired(false),
          )
          .addChannelOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.TARGET_CHANNEL)
              .setDescription(moveChannelDesc.base)
              .setDescriptionLocalizations(moveChannelDesc.localizations)
              .addChannelTypes(ChannelType.GuildVoice)
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.REASON)
              .setDescription(moveReasonDesc.base)
              .setDescriptionLocalizations(moveReasonDesc.localizations)
              .setRequired(false),
          ),
      );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVcCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default vcCommand;
