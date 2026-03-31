// src/bot/shared/errorChannelNotifier.ts
// エラーチャンネル通知ユーティリティ

import { ChannelType, type Guild } from "discord.js";
import { logPrefixed, tGuild } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { getBotGuildConfigService } from "../services/botCompositionRoot";
import { createErrorEmbed, createWarningEmbed } from "../utils/messageResponse";

/** エラー通知のコンテキスト情報 */
interface ErrorContext {
  /** 機能名（例: "メンバーログ"） */
  feature: string;
  /** 処理内容（例: "入室通知の送信失敗"） */
  action: string;
}

/** Embed フィールド値の最大文字数（Discord 制限） */
const MAX_FIELD_VALUE_LENGTH = 1024;

/**
 * エラーメッセージを安全に抽出する
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

/**
 * エラー発生時にギルドのエラーチャンネルへ通知Embedを送信する
 * エラーチャンネルが未設定の場合はスキップする
 * 送信失敗時はログのみ記録し、再帰通知はしない
 */
export async function notifyErrorChannel(
  guild: Guild,
  error: unknown,
  context: ErrorContext,
): Promise<void> {
  try {
    const config = await getBotGuildConfigService().getConfig(guild.id);
    if (!config?.errorChannelId) return;

    const channel = await guild.channels
      .fetch(config.errorChannelId)
      .catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const featureLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.feature",
    );
    const actionLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.action",
    );
    const messageLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.message",
    );
    const title = await tGuild(
      guild.id,
      "guildConfig:error-notification.title",
    );

    const errorMessage = extractErrorMessage(error);
    const truncatedMessage =
      errorMessage.length > MAX_FIELD_VALUE_LENGTH
        ? `${errorMessage.substring(0, MAX_FIELD_VALUE_LENGTH - 3)}...`
        : errorMessage;

    const embed = createErrorEmbed("", {
      title,
      timestamp: true,
      fields: [
        { name: featureLabel, value: context.feature, inline: true },
        { name: actionLabel, value: context.action, inline: true },
        { name: messageLabel, value: truncatedMessage },
      ],
    });

    await channel.send({ embeds: [embed] });
  } catch {
    // 通知失敗は再帰しない（ログのみ）
    logger.debug(
      logPrefixed(
        "system:log_prefix.error_channel",
        "system:error_channel.send_error_failed",
        { guildId: guild.id },
      ),
    );
  }
}

/**
 * 警告発生時にギルドのエラーチャンネルへ警告通知Embedを送信する
 * エラーチャンネルが未設定の場合はスキップする
 * 送信失敗時はログのみ記録し、再帰通知はしない
 */
export async function notifyWarnChannel(
  guild: Guild,
  message: string,
  context: ErrorContext,
): Promise<void> {
  try {
    const config = await getBotGuildConfigService().getConfig(guild.id);
    if (!config?.errorChannelId) return;

    const channel = await guild.channels
      .fetch(config.errorChannelId)
      .catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const featureLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.feature",
    );
    const actionLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.action",
    );
    const messageLabel = await tGuild(
      guild.id,
      "guildConfig:error-notification.message",
    );
    const title = await tGuild(
      guild.id,
      "guildConfig:error-notification.warn_title",
    );

    const truncatedMessage =
      message.length > MAX_FIELD_VALUE_LENGTH
        ? `${message.substring(0, MAX_FIELD_VALUE_LENGTH - 3)}...`
        : message;

    const embed = createWarningEmbed("", {
      title,
      timestamp: true,
      fields: [
        { name: featureLabel, value: context.feature, inline: true },
        { name: actionLabel, value: context.action, inline: true },
        { name: messageLabel, value: truncatedMessage },
      ],
    });

    await channel.send({ embeds: [embed] });
  } catch {
    logger.debug(
      logPrefixed(
        "system:log_prefix.error_channel",
        "system:error_channel.send_warn_failed",
        { guildId: guild.id },
      ),
    );
  }
}
