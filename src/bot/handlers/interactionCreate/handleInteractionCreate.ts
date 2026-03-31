// src/bot/handlers/interactionCreate/handleInteractionCreate.ts
// interactionCreate のユースケース処理エントリ

import type { Interaction } from "discord.js";
import type { BotClient } from "../../client";
import { handleAutocomplete, handleChatInputCommand } from "./flow/command";
import {
  handleButton,
  handleRoleSelectMenu,
  handleStringSelectMenu,
  handleUserSelectMenu,
} from "./flow/components";
import { handleModalSubmit } from "./flow/modal";

/**
 * Discord インタラクションをタイプ別にルーティングして処理する
 * @param interaction 受信したインタラクション
 * @returns 実行完了を示す Promise
 */
export async function handleInteractionCreate(
  interaction: Interaction,
): Promise<void> {
  const client = interaction.client as BotClient;

  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction, client);
    return;
  }

  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction, client);
    return;
  }

  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }

  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }

  if (interaction.isUserSelectMenu()) {
    await handleUserSelectMenu(interaction);
    return;
  }

  if (interaction.isRoleSelectMenu()) {
    await handleRoleSelectMenu(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    await handleStringSelectMenu(interaction);
    return;
  }
}
