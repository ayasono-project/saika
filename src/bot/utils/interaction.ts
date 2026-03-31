// src/bot/utils/interaction.ts
// Discord Interaction関連のユーティリティ関数

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js";
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";

type AnyInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction
  | UserSelectMenuInteraction
  | StringSelectMenuInteraction;

/**
 * 返信済み状態を考慮して reply / followUp を安全に切り替える
 * @param interaction 対象インタラクション
 * @param options 返信オプション
 * @returns 実行完了
 */
export async function safeReply(
  interaction: AnyInteraction,
  options: InteractionReplyOptions,
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(options);
    } else {
      await interaction.reply(options);
    }
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      const ignoredCodes: number[] = [
        RESTJSONErrorCodes.UnknownInteraction,
        RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
      ];
      if (ignoredCodes.includes(error.code as number)) {
        return;
      }
    }
    throw error;
  }
}
