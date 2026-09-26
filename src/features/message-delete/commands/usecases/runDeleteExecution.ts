// 削除実行フェーズ

import { type MessageComponentInteraction } from "discord.js";
import {
  createErrorEmbed,
  createWarningEmbed,
} from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import {
  MSG_DEL_PHASE_TIMEOUT_MS,
  type ScannedMessageWithChannel,
} from "../../constants/messageDeleteConstants";
import {
  type DeleteProgressData,
  deleteScannedMessages,
  type MessageDeleteResult,
} from "../../services/messageDeleteService";
import {
  buildCompletionEmbed,
  buildDeleteProgressContent,
} from "../messageDeleteEmbedBuilder";
import type { ParsedOptions } from "./dialogUtils";

/**
 * 確認済みメッセージの削除を実行する
 * - 14分タイムアウトで削除を中断し、削除済み件数を通知する
 * - 削除進捗をリアルタイムで表示
 * - 表示の失敗（進捗・完了）では削除を止めず、「削除に失敗」とも表示しない
 * @param interaction 削除実行ボタンの MessageComponentInteraction
 * @param targetMessages 削除対象のスキャン済みメッセージ配列（除外済みを含まない）
 * @param options パース済みコマンドオプション（ログ出力に使用）
 * @returns 処理完了を示す Promise
 */
export async function executeDelete(
  interaction: MessageComponentInteraction,
  targetMessages: ScannedMessageWithChannel[],
  options: ParsedOptions,
): Promise<void> {
  const deleteController = new AbortController();

  // 削除タイムアウトタイマー（14分で削除を中断）
  const deleteTimeoutId = setTimeout(() => {
    deleteController.abort();
  }, MSG_DEL_PHASE_TIMEOUT_MS);

  let result: MessageDeleteResult;
  try {
    result = await deleteScannedMessages(
      targetMessages,
      async (data: DeleteProgressData) => {
        // 進捗表示は途中経過にすぎないため、表示に失敗しても削除は続ける
        await interaction
          .editReply({
            content: buildDeleteProgressContent(interaction.locale, data),
            embeds: [],
            components: [],
          })
          .catch((error: unknown) => {
            logger.warn(
              logPrefixed(
                "system:log_prefix.msg_del",
                "messageDelete:log.progress_display_failed",
                { error: String(error) },
              ),
            );
          });
      },
      deleteController.signal,
    );
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.delete_error",
        { error: String(error) },
      ),
    );
    await interaction
      .editReply({
        embeds: [
          createErrorEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.delete_failed",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_delete_error",
              ),
            },
          ),
        ],
        content: "",
        components: [],
      })
      .catch(() => {});
    return;
  } finally {
    clearTimeout(deleteTimeoutId);
  }

  // ここから先は削除が終わった後の記録と表示。表示に失敗しても削除自体は済んでいるので、記録を先に残す
  logDeletion(interaction, options, result);

  // 表示の組み立て（Embed の検証）と送信のどちらで失敗しても、「削除に失敗」にはしない
  try {
    const resultEmbed = deleteController.signal.aborted
      ? // 削除タイムアウト: 実際に削除できた件数を通知して終了
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "messageDelete:user-response.delete_timed_out",
            {
              count: result.totalDeleted,
            },
          ),
          { title: tInteraction(interaction.locale, "common:title_timeout") },
        )
      : buildCompletionEmbed(
          interaction.locale,
          result.totalDeleted,
          result.channelBreakdown,
        );
    await interaction.editReply({
      embeds: [resultEmbed],
      components: [],
      content: "",
    });
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.result_display_failed",
        { error: String(error) },
      ),
    );
  }
}

/**
 * 削除した件数と条件をログに残す（タイムアウトで途中までの場合も、実際に削除できた件数で残す）
 * 仕様ログフォーマット: [count=N] [target=<id>] [keyword="..."] [days=N | after=... before=...]
 * @param interaction 削除実行ボタンの MessageComponentInteraction（実行者の特定に使用）
 * @param options パース済みコマンドオプション
 * @param result 削除結果
 */
function logDeletion(
  interaction: MessageComponentInteraction,
  options: ParsedOptions,
  result: MessageDeleteResult,
): void {
  const countPart = options.countSpecified ? ` count=${options.count}` : "";
  const targetPart =
    options.targetUserIds.length > 0
      ? ` target=${options.targetUserIds.join(",")}`
      : "";
  const keywordPart = options.keyword ? ` keyword="${options.keyword}"` : "";
  const periodPart = options.daysOption
    ? ` days=${options.daysOption}`
    : [
        options.afterStr && `after=${options.afterStr}`,
        options.beforeStr && `before=${options.beforeStr}`,
      ]
        .filter(Boolean)
        .join(" ");
  logger.info(
    logPrefixed("system:log_prefix.msg_del", "messageDelete:log.deleted", {
      userId: interaction.user.id,
      count: result.totalDeleted,
      countPart,
      targetPart,
      keywordPart,
      periodPart: periodPart ? ` ${periodPart}` : "",
      channels: Object.keys(result.channelBreakdown).join(", "),
    }),
  );
}
