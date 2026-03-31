// src/bot/features/message-delete/commands/usecases/runFinalConfirmDialog.ts
// Stage 2: 最終確認ダイアログ処理

import { type MessageComponentInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import { createWarningEmbed } from "../../../../utils/messageResponse";
import {
  MSG_DEL_COLLECTOR_IDLE_MS,
  MSG_DEL_CUSTOM_ID,
  MSG_DEL_PAGE_SIZE,
  type ScannedMessage,
} from "../../constants/messageDeleteConstants";
import {
  buildFinalConfirmComponents,
  buildFinalConfirmEmbed,
} from "../messageDeleteEmbedBuilder";
import { DIALOG_TYPE, type FinalResult, showJumpModal } from "./dialogUtils";

/**
 * Stage 2: 最終確認ダイアログを表示し、ユーザーの操作を待機する
 * フィルターなしで全削除対象を一覧表示し、削除実行・戻る・キャンセルを処理する
 * @param baseInteraction プレビューダイアログで「削除する」を押したときの MessageComponentInteraction
 * @param targetMessages 削除対象メッセージ（除外済みを含まない）
 * @param timeoutMs コレクターのタイムアウト（プレビューと共有する残り時間）
 * @returns 最終確認ダイアログの結果（confirm / back / cancel / timeout）
 */
export async function showFinalConfirmDialog(
  baseInteraction: MessageComponentInteraction,
  targetMessages: ScannedMessage[],
  timeoutMs: number,
): Promise<FinalResult> {
  let currentPage = 0;
  const locale = baseInteraction.locale;
  const totalPages = Math.ceil(targetMessages.length / MSG_DEL_PAGE_SIZE);

  const buildReplyPayload = (page: number) => ({
    embeds: [
      buildFinalConfirmEmbed(
        locale,
        targetMessages,
        page,
        targetMessages.length,
      ),
    ],
    components: buildFinalConfirmComponents(
      locale,
      page,
      totalPages,
      targetMessages.length,
    ),
    content: "",
  });

  const response = await baseInteraction.editReply(buildReplyPayload(0));

  return new Promise((resolve) => {
    const collector = response.createMessageComponentCollector({
      time: timeoutMs,
      idle: MSG_DEL_COLLECTOR_IDLE_MS,
    });

    // collector.stop() は end イベントを同期的に発火させるため、
    // collect ハンドラで処理済みかどうかを end ハンドラが判定できるよう
    // stop() より先にフラグを立てる
    let handledByCollect = false;

    /* istanbul ignore start -- Discord.js collector callback */
    collector.on("collect", async (i) => {
      if (i.user.id !== baseInteraction.user.id) {
        await i.reply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                baseInteraction.locale,
                "messageDelete:user-response.not_authorized",
              ),
              {
                title: tInteraction(
                  baseInteraction.locale,
                  "common:title_permission_denied",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // ── 終端アクション（resolve して collector を停止） ──
      if (i.customId === MSG_DEL_CUSTOM_ID.FINAL_YES) {
        await i.deferUpdate().catch(() => {});
        handledByCollect = true;
        collector.stop();
        resolve({ type: DIALOG_TYPE.Confirm, interaction: i });
        return;
      }
      if (i.customId === MSG_DEL_CUSTOM_ID.FINAL_NO) {
        await i.deferUpdate().catch(() => {});
        handledByCollect = true;
        collector.stop();
        resolve({ type: DIALOG_TYPE.Cancel, interaction: i });
        return;
      }
      if (i.customId === MSG_DEL_CUSTOM_ID.FINAL_BACK) {
        await i.deferUpdate().catch(() => {});
        handledByCollect = true;
        collector.stop();
        resolve({ type: DIALOG_TYPE.Back, interaction: i });
        return;
      }

      // ── ページネーション（仕様: プレビューと同一 customId を使用） ──
      if (i.customId === MSG_DEL_CUSTOM_ID.FIRST) {
        currentPage = 0;
        await i.update(buildReplyPayload(currentPage)).catch(() => {});
        return;
      }
      if (i.customId === MSG_DEL_CUSTOM_ID.PREV) {
        currentPage = Math.max(0, currentPage - 1);
        await i.update(buildReplyPayload(currentPage)).catch(() => {});
        return;
      }
      if (i.customId === MSG_DEL_CUSTOM_ID.NEXT) {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        await i.update(buildReplyPayload(currentPage)).catch(() => {});
        return;
      }
      if (i.customId === MSG_DEL_CUSTOM_ID.LAST) {
        currentPage = Math.max(0, totalPages - 1);
        await i.update(buildReplyPayload(currentPage)).catch(() => {});
        return;
      }

      // ── ページジャンプ ──
      if (i.customId === MSG_DEL_CUSTOM_ID.JUMP) {
        const raw = await showJumpModal(i, totalPages);
        if (raw === null) {
          await baseInteraction
            .editReply(buildReplyPayload(currentPage))
            .catch(() => {});
          return;
        }
        const pageNum = parseInt(raw, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          await baseInteraction
            .followUp({
              embeds: [
                createWarningEmbed(
                  tInteraction(
                    baseInteraction.locale,
                    "messageDelete:user-response.jump_invalid_page",
                    {
                      total: totalPages,
                    },
                  ),
                  {
                    title: tInteraction(
                      baseInteraction.locale,
                      "common:title_invalid_input",
                    ),
                  },
                ),
              ],
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        } else {
          currentPage = pageNum - 1;
        }
        await baseInteraction
          .editReply(buildReplyPayload(currentPage))
          .catch(() => {});
        return;
      }
    });
    /* istanbul ignore stop */

    /* istanbul ignore start -- Discord.js collector callback */
    collector.on("end", async (_, reason) => {
      // collect ハンドラで処理済みの場合（通常終了・キャンセル・戻る）はスキップ
      // "time" 以外（messageDelete / channelDelete 等）でも未処理なら Timeout として解決し
      // ロックを確実に解放する
      logger.debug(
        `[MsgDel] FinalConfirm collector ended: reason=${String(reason)}, handledByCollect=${handledByCollect}`,
      );
      if (handledByCollect) return;
      void reason;
      await baseInteraction
        .editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                baseInteraction.locale,
                "messageDelete:user-response.timed_out",
              ),
              {
                title: tInteraction(
                  baseInteraction.locale,
                  "common:title_timeout",
                ),
              },
            ),
          ],
          components: [],
          content: "",
        })
        .catch(() => {});
      resolve({ type: DIALOG_TYPE.Timeout });
    });
    /* istanbul ignore stop */
  });
}
