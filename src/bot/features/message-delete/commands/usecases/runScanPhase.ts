// src/bot/features/message-delete/commands/usecases/runScanPhase.ts
// メッセージスキャンフェーズ

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  type MessageComponentInteraction,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  createErrorEmbed,
  createInfoEmbed,
} from "../../../../utils/messageResponse";
import {
  MSG_DEL_CUSTOM_ID,
  MSG_DEL_PHASE_TIMEOUT_MS,
  type ScannedMessageWithChannel,
} from "../../constants/messageDeleteConstants";
import {
  type ScanProgressData,
  scanMessages,
} from "../../services/messageDeleteService";
import type { ParsedOptions } from "./dialogUtils";

/**
 * メッセージのプレスキャンを実行する
 * - 「収集分を確認」ボタンで中断可能
 * - 14分タイムアウトでスキャンを自動中断
 * - 中断/タイムアウト時に収集済みメッセージがあればプレビューへ遷移
 * @param interaction 条件設定フェーズから渡された interaction（fresh な15分 token）
 * @param channels スキャン対象のチャンネル一覧
 * @param options パース済みコマンドオプション
 * @returns 収集済みメッセージ配列（null の場合は処理終了）
 */
export async function runScanPhase(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  channels: GuildTextBasedChannel[],
  options: ParsedOptions,
): Promise<ScannedMessageWithChannel[] | null> {
  const { count, targetUserIds, keyword, afterTs, beforeTs } = options;
  const controller = new AbortController();

  // タイムアウト原因の追跡（タイムアウト vs ユーザー中断）
  // オブジェクト参照にすることで TypeScript の制御フロー解析による誤ナローイングを回避
  const cancelState = { reason: "user" as "user" | "timeout" };

  const buildProgressContent = (totalScanned: number, collected: number) =>
    tInteraction(
      interaction.locale,
      "messageDelete:user-response.scan_progress",
      {
        totalScanned,
        collected,
        limit: count,
      },
    );

  const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(MSG_DEL_CUSTOM_ID.SCAN_CANCEL)
      .setLabel(
        tInteraction(interaction.locale, "messageDelete:ui.button.scan_cancel"),
      )
      .setStyle(ButtonStyle.Secondary),
  );

  const scanReply = await interaction.editReply({
    content: buildProgressContent(0, 0),
    embeds: [],
    components: [cancelRow],
  });

  // スキャンタイムアウトタイマー（14分でスキャンを中断）
  const scanTimeoutId = setTimeout(() => {
    cancelState.reason = "timeout";
    controller.abort();
  }, MSG_DEL_PHASE_TIMEOUT_MS);

  // 「収集分を確認」ボタンコレクター（ユーザーによる任意中断）
  const cancelCollector = scanReply.createMessageComponentCollector({
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) =>
      i.customId === MSG_DEL_CUSTOM_ID.SCAN_CANCEL &&
      i.user.id === interaction.user.id,
    max: 1,
  });
  const cancelWatcher = new Promise<void>((resolve) => {
    /* istanbul ignore start -- Discord.js collector callback */
    cancelCollector.on("collect", async (i) => {
      cancelState.reason = "user";
      controller.abort();
      await i.deferUpdate().catch(() => {});
      resolve();
    });
    /* istanbul ignore stop */
    /* istanbul ignore start -- Discord.js collector callback */
    cancelCollector.on("end", (_, reason) => {
      // "user" 以外（messageDelete / channelDelete 等）でメッセージが削除された場合は
      // スキャンを即座に中断する。"user" は finally の cancelCollector.stop() による通常停止。
      logger.debug(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.cancel_collector_ended",
          {
            reason: String(reason),
          },
        ),
      );
      if (reason !== "user") {
        logger.debug(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.aborting_non_user_end",
          ),
        );
        controller.abort();
      }
      resolve();
    });
    /* istanbul ignore stop */
  });

  let scannedMessages: ScannedMessageWithChannel[];
  try {
    scannedMessages = await scanMessages(channels, {
      locale: interaction.locale,
      count,
      targetUserIds,
      keyword,
      afterTs,
      beforeTs,
      signal: controller.signal,
      onProgress: async (data: ScanProgressData) => {
        await interaction.editReply({
          content: buildProgressContent(data.totalScanned, data.collected),
          embeds: [],
          components: [cancelRow],
        });
      },
    });
  } catch (error) {
    logger.error(
      logPrefixed("system:log_prefix.msg_del", "messageDelete:log.scan_error", {
        error: String(error),
      }),
    );
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          tInteraction(
            interaction.locale,
            "messageDelete:user-response.scan_failed",
          ),
          {
            title: tInteraction(interaction.locale, "common:title_scan_error"),
          },
        ),
      ],
      content: "",
      components: [],
    });
    return null;
  } finally {
    clearTimeout(scanTimeoutId);
    cancelCollector.stop();
    await cancelWatcher;
  }

  // ── 中断・タイムアウト処理 ──
  if (controller.signal.aborted) {
    if (scannedMessages.length === 0) {
      // 収集0件: タイムアウトとユーザー中断で別メッセージを表示して終了
      const msgKey =
        cancelState.reason === "timeout"
          ? ("messageDelete:user-response.scan_timed_out_empty" as const)
          : ("messageDelete:user-response.cancelled" as const);
      await interaction.editReply({
        embeds: [createInfoEmbed(tInteraction(interaction.locale, msgKey))],
        content: "",
        components: [],
      });
      return null;
    }

    // 収集1件以上: タイムアウト時のみ通知メッセージを表示してからプレビューへ遷移
    if (cancelState.reason === "timeout") {
      await interaction.editReply({
        embeds: [
          createInfoEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.scan_timed_out",
            ),
          ),
        ],
        content: "",
        components: [],
      });
    }
    // ユーザー中断で収集1件以上: 中間画面なしで直接プレビューへ遷移
  }

  return scannedMessages;
}
