// エラーチャンネル通知ユーティリティ

import { ChannelType, type Guild } from "discord.js";
import {
  type GuildTFunction,
  getGuildTranslator,
} from "../../shared/locale/helpers";
import type { AllParseKeys } from "../../shared/locale/i18n";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { getBotGuildSettingsService } from "../services/botCompositionRoot";
import { createErrorEmbed, createWarningEmbed } from "../utils/messageResponse";

/**
 * エラー通知のコンテキスト情報
 * 通知先のサーバーの言語で出すため、文言ではなく翻訳キーで受け取る
 */
interface ErrorContext {
  /** 機能名の翻訳キー（例: "memberLog:embed.field.value.error_notification_feature"） */
  featureKey: AllParseKeys;
  /** 処理内容の翻訳キー（例: "memberLog:embed.field.value.join_notification_failed_action"） */
  actionKey: AllParseKeys;
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
 * @param resolveMessage 詳細欄の本文を作る関数。通知先のサーバーの言語の翻訳関数を受け取る（作るときの失敗も送信の失敗として扱う）
 * @param context 機能名と処理内容の翻訳キー
 * @returns 実際に送れたときだけ true
 */
async function sendToErrorChannel(
  guild: Guild,
  kind: NotificationKind,
  resolveMessage: (t: GuildTFunction) => string,
  context: ErrorContext,
): Promise<boolean> {
  try {
    const config = await getBotGuildSettingsService().getSettings(guild.id);
    if (!config?.errorChannelId) return false;

    const channel = await guild.channels
      .fetch(config.errorChannelId)
      .catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return false;

    const t = await getGuildTranslator(guild.id);
    const message = resolveMessage(t);
    const truncatedMessage =
      message.length > MAX_FIELD_VALUE_LENGTH
        ? `${message.substring(0, MAX_FIELD_VALUE_LENGTH - 3)}...`
        : message;

    const embed = kind.createEmbed("", {
      title: t(kind.titleKey),
      timestamp: true,
      fields: [
        {
          name: t("guildSettings:error-notification.feature"),
          value: t(context.featureKey),
          inline: true,
        },
        {
          name: t("guildSettings:error-notification.action"),
          value: t(context.actionKey),
          inline: true,
        },
        {
          name: t("guildSettings:error-notification.message"),
          value: truncatedMessage,
        },
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
 * @param context 機能名と処理内容の翻訳キー
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
 * @param buildMessage 詳細欄の本文を作る関数。通知先のサーバーの言語の翻訳関数を受け取る
 * @param context 機能名と処理内容の翻訳キー
 * @returns 実際に送れたときだけ true（未設定・取得できない・テキストチャンネルでない・送信失敗は false）
 */
export async function notifyWarnChannel(
  guild: Guild,
  buildMessage: (t: GuildTFunction) => string,
  context: ErrorContext,
): Promise<boolean> {
  return sendToErrorChannel(
    guild,
    NOTIFICATION_KINDS.warn,
    buildMessage,
    context,
  );
}
