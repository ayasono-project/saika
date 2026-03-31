// src/bot/features/sticky-message/commands/stickyMessageCommand.execute.ts
// スティッキーメッセージコマンド実行処理

import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { STICKY_MESSAGE_COMMAND } from "./stickyMessageCommand.constants";
import { handleStickyMessageRemove } from "./usecases/stickyMessageRemove";
import { handleStickyMessageSet } from "./usecases/stickyMessageSet";
import { handleStickyMessageUpdate } from "./usecases/stickyMessageUpdate";
import { handleStickyMessageView } from "./usecases/stickyMessageView";

/**
 * sticky-message コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeStickyMessageCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    // ギルドIDを取得し、サーバー内コマンドであることを確認する
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    // MANAGE_CHANNELS 権限チェック
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) &&
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      throw new ValidationError(
        tInteraction(
          interaction.locale,
          "stickyMessage:user-response.permission_denied",
        ),
      );
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case STICKY_MESSAGE_COMMAND.SUBCOMMAND.SET:
        await handleStickyMessageSet(interaction);
        break;
      case STICKY_MESSAGE_COMMAND.SUBCOMMAND.REMOVE:
        await handleStickyMessageRemove(interaction, guildId);
        break;
      case STICKY_MESSAGE_COMMAND.SUBCOMMAND.VIEW:
        await handleStickyMessageView(interaction, guildId);
        break;
      case STICKY_MESSAGE_COMMAND.SUBCOMMAND.UPDATE:
        await handleStickyMessageUpdate(interaction);
        break;
      default:
        throw new ValidationError(
          tInteraction(interaction.locale, COMMON_I18N_KEYS.INVALID_SUBCOMMAND),
        );
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
