// src/bot/features/vc-command/commands/vcCommand.execute.ts
// VC操作コマンド実行処理

import { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { executeVcLimit } from "./usecases/vcLimit";
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

    const voiceChannel = await getManagedVoiceChannel(interaction, guildId);
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case VC_COMMAND.SUBCOMMAND.RENAME:
        await executeVcRename(interaction, voiceChannel.id);
        break;
      case VC_COMMAND.SUBCOMMAND.LIMIT:
        await executeVcLimit(interaction, voiceChannel.id);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
