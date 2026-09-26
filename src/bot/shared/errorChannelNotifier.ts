// エラーチャンネル通知ユーティリティ

import { ChannelType, type Guild } from "discord.js";
import { logPrefixed, tGuild } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { getBotGuildSettingsService } from "../services/botCompositionRoot";
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
 * 通知の種類ごとの、タイトルのキー・Embed の作り方・送信に失敗したときのログのキー
 * Embed の作り方は送るときに参照する（読み込んだ時点では参照せず、読み込み順に依存させない）
 */
const NOTIFICATION_KINDS = {
  error: {
    titleKey: "guildSettings:error-notification.title",
    createEmbed: (...args: Parameters<typeof createErrorEmbed>) =>
      createErrorEmbed(...args),
    failedLogKey: "system:error_channel.send_error_failed",
  },
  warn: {
    titleKey: "guildSettings:error-notification.warn_title",
    createEmbed: (...args: Parameters<typeof createWarningEmbed>) =>
      createWarningEmbed(...args),
    failedLogKey: "system:error_channel.send_warn_failed",
  },
} as const;

/** 通知の種類 */
type NotificationKind =
  (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

/**
 * エラーメッセージを安全に抽出する
 * @param error 発生したエラー
 * @returns エラーメッセージ
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

/**
 * ギルドのエラーチャンネルへ通知 Embed を送信する（エラー通知・警告通知で共通）
 *
 * エラーチャンネルが未設定・取得できない・テキストチャンネルでないときは送らない。
 * 送信に失敗したとき（Bot がエラーチャンネルに入れない 50001 など）は warn を残し、再帰通知はしない。
 * 呼び出し側が「管理者に届いたか」で代わりの連絡先を選べるよう、送れたかどうかを返す
 * @param guild 対象ギルド
 * @param kind 通知の種類
 * @param resolveMessage 詳細欄の本文を作る関数（作るときの失敗も送信の失敗として扱う）
 * @param context 機能名と処理内容
 * @returns 実際に送れたときだけ true
 */
async function sendToErrorChannel(
  guild: Guild,
  kind: NotificationKind,
  resolveMessage: () => string,
  context: ErrorContext,
): Promise<boolean> {
  try {
    const config = await getBotGuildSettingsService().getSettings(guild.id);
    if (!config?.errorChannelId) return false;

    const channel = await guild.channels
      .fetch(config.errorChannelId)
      .catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return false;

    const featureLabel = await tGuild(
      guild.id,
      "guildSettings:error-notification.feature",
    );
    const actionLabel = await tGuild(
      guild.id,
      "guildSettings:error-notification.action",
    );
    const messageLabel = await tGuild(
      guild.id,
      "guildSettings:error-notification.message",
    );
    const title = await tGuild(guild.id, kind.titleKey);

    const message = resolveMessage();
    const truncatedMessage =
      message.length > MAX_FIELD_VALUE_LENGTH
        ? `${message.substring(0, MAX_FIELD_VALUE_LENGTH - 3)}...`
        : message;

    const embed = kind.createEmbed("", {
      title,
      timestamp: true,
      fields: [
        { name: featureLabel, value: context.feature, inline: true },
        { name: actionLabel, value: context.action, inline: true },
        { name: messageLabel, value: truncatedMessage },
      ],
    });

    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    // 通知失敗は再帰しない（ログのみ）。管理者に届かなかったことが分かるよう warn にする
    logger.warn(
      logPrefixed("system:log_prefix.error_channel", kind.failedLogKey, {
        guildId: guild.id,
      }),
      error,
    );
    return false;
  }
}

/**
 * エラー発生時にギルドのエラーチャンネルへ通知Embedを送信する
 * エラーチャンネルが未設定の場合はスキップする
 * 送信失敗時はログのみ記録し、再帰通知はしない
 * @param guild 対象ギルド
 * @param error 発生したエラー（詳細欄にメッセージを載せる）
 * @param context 機能名と処理内容
 * @returns 実行完了を示す Promise
 */
export async function notifyErrorChannel(
  guild: Guild,
  error: unknown,
  context: ErrorContext,
): Promise<void> {
  await sendToErrorChannel(
    guild,
    NOTIFICATION_KINDS.error,
    () => extractErrorMessage(error),
    context,
  );
}

/**
 * 警告発生時にギルドのエラーチャンネルへ警告通知Embedを送信する
 * エラーチャンネルが未設定の場合はスキップする
 * 送信失敗時はログのみ記録し、再帰通知はしない
 * @param guild 対象ギルド
 * @param message 詳細欄の本文
 * @param context 機能名と処理内容
 * @returns 実際に送れたときだけ true（未設定・取得できない・テキストチャンネルでない・送信失敗は false）
 */
export async function notifyWarnChannel(
  guild: Guild,
  message: string,
  context: ErrorContext,
): Promise<boolean> {
  return sendToErrorChannel(
    guild,
    NOTIFICATION_KINDS.warn,
    () => message,
    context,
  );
}
