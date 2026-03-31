// src/bot/features/bump-reminder/handlers/bumpMessageCreateHandler.ts
// messageCreate における Bump 検知のユースケース処理

import type { Message } from "discord.js";
import { env, NODE_ENV } from "../../../../shared/config/env";
import type { BotClient } from "../../../client";
import {
  BUMP_COMMANDS,
  BUMP_SERVICES,
  resolveBumpService,
} from "../constants/bumpReminderConstants";
import { handleBumpDetected } from "./bumpReminderHandler";

/**
 * messageCreate から Bump 実行メッセージを検知して処理を開始する関数
 * @param message 受信した Discord メッセージ
 * @returns 実行完了を示す Promise
 */
export async function handleBumpMessageCreate(message: Message): Promise<void> {
  // DMは対象外（ギルド機能のため）
  if (!message.guild) return;

  const client = message.client as BotClient;
  const guildId = message.guild.id;
  const channelId = message.channel.id;

  // 非本番かつテストモードでは手動テストコマンドを許可
  if (
    env.NODE_ENV !== NODE_ENV.PRODUCTION &&
    env.TEST_MODE &&
    !message.author.bot
  ) {
    if (message.content.toLowerCase() === `test ${BUMP_COMMANDS.DISBOARD}`) {
      await handleBumpDetected(
        client,
        guildId,
        channelId,
        message.id,
        BUMP_SERVICES.DISBOARD,
      );
      return;
    }
    if (message.content.toLowerCase() === `test ${BUMP_COMMANDS.DISSOKU}`) {
      await handleBumpDetected(
        client,
        guildId,
        channelId,
        message.id,
        BUMP_SERVICES.DISSOKU,
      );
      return;
    }
  }

  // 本番通常フロー: Bot以外の発言は無視
  if (message.author.bot === false) return;

  // Slash command 起点のメッセージのみ判定対象
  const commandName = message.interaction?.commandName;
  if (!commandName) return;

  // Bot ID + commandName から対象サービスを解決
  const serviceName = resolveBumpService(message.author.id, commandName);
  if (!serviceName) return;

  // Bump検知確定後のユースケース処理へ委譲
  await handleBumpDetected(client, guildId, channelId, message.id, serviceName);
}
