// src/bot/handlers/interactionCreate/flow/command.ts
// スラッシュコマンド / オートコンプリート処理

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import type { BotClient } from "../../../client";
import { handleCommandError } from "../../../errors/interactionErrorHandler";

// interactionCreate のコマンド系処理で共通利用する既定値
const INTERACTION_CONSTANTS = {
  DEFAULT_COOLDOWN_SECONDS: 3,
} as const;

/**
 * スラッシュコマンド実行を処理する関数
 */
export async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction,
  client: BotClient,
): Promise<void> {
  // コマンドレジストリから実装を解決
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    // 未登録コマンドは警告のみ出して安全に終了
    logger.warn(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.unknown_command",
        { commandName: interaction.commandName },
        "command",
      ),
    );
    return;
  }

  // クールダウン秒数はコマンド固有値を優先し、未指定時のみ既定値を利用
  const cooldownTime =
    command.cooldown ?? INTERACTION_CONSTANTS.DEFAULT_COOLDOWN_SECONDS;
  // クールダウン判定はコマンド実行前に一度だけ行う
  const remaining = client.cooldownManager.check(
    command.data.name,
    interaction.user.id,
    cooldownTime,
  );

  // クールダウン中はギルド言語で待機メッセージを返して終了
  if (remaining > 0) {
    const cooldownMessage = tInteraction(
      interaction.locale,
      "common:cooldown.wait",
      {
        seconds: remaining,
      },
    );
    await interaction.reply({
      content: cooldownMessage,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // コマンド本体を実行
    await command.execute(interaction);
    logger.debug(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.command_executed",
        { commandName: command.data.name, userId: interaction.user.id },
        "command",
      ),
    );
  } catch (error) {
    // 実行例外は共通エラーハンドラへ委譲
    logger.error(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.command_error",
        { commandName: command.data.name },
        "command",
      ),
      error,
    );
    await handleCommandError(interaction, error);
  }
}

/**
 * オートコンプリート応答を処理する関数
 */
export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  client: BotClient,
): Promise<void> {
  // オートコンプリート対応コマンドのみ処理
  const command = client.commands.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    // 非対応コマンドは応答不要
    // ここで return し、不要な例外ログを増やさない
    return;
  }

  try {
    // 候補生成ロジックをコマンド実装へ委譲
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.autocomplete_error",
        { commandName: interaction.commandName },
        "command",
      ),
      error,
    );
  }
}
