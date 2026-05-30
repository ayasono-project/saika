// src/features/vc-command/commands/vcCommand.execute.ts
// VC操作コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import { ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { executeVcDisconnect } from "./usecases/vcDisconnect";
import { executeVcLimit } from "./usecases/vcLimit";
import { executeVcMove } from "./usecases/vcMove";
import { executeVcRename } from "./usecases/vcRename";
import { getManagedVoiceChannel } from "./usecases/vcVoiceChannelGuard";
import { VC_COMMAND } from "./vcCommand.constants";

/**
 * vc コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeVcCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      // 自分のVCを変える系: 参加中の管理対象VCを解決してから委譲する
      case VC_COMMAND.SUBCOMMAND.RENAME: {
        const voiceChannel = await getManagedVoiceChannel(interaction, guildId);
        await executeVcRename(interaction, voiceChannel.id);
        break;
      }
      case VC_COMMAND.SUBCOMMAND.LIMIT: {
        const voiceChannel = await getManagedVoiceChannel(interaction, guildId);
        await executeVcLimit(interaction, voiceChannel.id);
        break;
      }
      // 他メンバーを動かす系: 管理対象チェックなしで任意のメンバー/VCを操作する
      case VC_COMMAND.SUBCOMMAND.DISCONNECT:
        await executeVcDisconnect(interaction, guildId);
        break;
      case VC_COMMAND.SUBCOMMAND.MOVE:
        await executeVcMove(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
