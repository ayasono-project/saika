// src/bot/features/message-delete/commands/messageDeleteCommand.execute.ts
// /message-delete コマンド実行処理

import {
  type ChatInputCommandInteraction,
  type Guild,
  type MessageComponentInteraction,
  MessageFlags,
} from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import {
  createErrorEmbed,
  createInfoEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  type MessageDeleteFilter,
  MSG_DEL_PHASE_TIMEOUT_MS,
  type ScannedMessageWithChannel,
} from "../constants/messageDeleteConstants";
import { buildTargetChannels } from "./usecases/buildTargetChannels";
import { DIALOG_TYPE, type ParsedOptions } from "./usecases/dialogUtils";
import { runConditionSetupStep } from "./usecases/runConditionSetupStep";
import { executeDelete } from "./usecases/runDeleteExecution";
import { showFinalConfirmDialog } from "./usecases/runFinalConfirmDialog";
import { showPreviewDialog } from "./usecases/runPreviewDialog";
import { runScanPhase } from "./usecases/runScanPhase";
import {
  hasBotRequiredPermissions,
  hasManageMessagesPermission,
  hasSlashCommandFilter,
  parseAndValidateOptions,
} from "./usecases/validateOptions";

// ===== サーバー単位の処理中ロック =====
// スキャン〜削除実行の間はロックを保持し、同一サーバー内の重複実行を防止する
// Bot 再起動でクリアされるメモリ管理のため、永続化は不要
const executingGuilds = new Set<string>();

/**
 * 投稿者タイプフィルター（既に居ない人）判定用に、現在のサーバーメンバーのID集合を取得する。
 * GuildMembers Intent 前提で全件 fetch し、失敗時はキャッシュにフォールバックして警告ログを残す。
 * @param guild 対象ギルド
 * @returns 現在のメンバーのユーザーID集合
 */
async function fetchGuildMemberIds(guild: Guild): Promise<Set<string>> {
  try {
    const members = await guild.members.fetch();
    return new Set(members.keys());
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.member_fetch_failed",
        { error: String(error) },
      ),
    );
    return new Set(guild.members.cache.keys());
  }
}

// ===== メインエクスポート =====

/**
 * /message-delete コマンド実行処理
 * @param interaction コマンド実行の ChatInputCommandInteraction
 * @returns 処理完了を示す Promise
 */
export async function executeMessageDeleteCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            tInteraction(interaction.locale, COMMON_I18N_KEYS.GUILD_ONLY),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_server_only",
              ),
            },
          ),
        ],
      });
      return;
    }

    const options = await parseAndValidateOptions(interaction);
    if (!options) return;

    if (!hasManageMessagesPermission(interaction)) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.no_permission",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_permission_denied",
              ),
            },
          ),
        ],
      });
      return;
    }

    // Bot 権限チェック（ManageMessages / ReadMessageHistory / ViewChannel）
    if (!hasBotRequiredPermissions(interaction)) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.bot_no_permission",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_bot_permission_denied",
              ),
            },
          ),
        ],
      });
      return;
    }

    // ── 処理中ロック取得（スキャン〜削除実行の重複実行防止） ──
    const guildId = interaction.guildId;
    if (executingGuilds.has(guildId)) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.locked",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_already_running",
              ),
            },
          ),
        ],
      });
      return;
    }
    executingGuilds.add(guildId);
    logger.debug(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.lock_acquired",
        { guildId },
      ),
    );

    try {
      // ── 条件設定フェーズ（user / channel をセレクトメニューで選択） ──
      const conditionResult = await runConditionSetupStep(
        interaction,
        hasSlashCommandFilter(options),
      );
      if (!conditionResult) return;

      // 条件設定フェーズの結果をオプションに反映
      options.targetUserIds = conditionResult.targetUserIds;
      options.channelIds = conditionResult.channelIds;
      options.authorType = conditionResult.authorType;

      // 条件設定フェーズの「スキャン開始」ボタンで得た fresh token を以降のフェーズで使う
      const scanInteraction = conditionResult.scanInteraction;

      const targetChannels = await buildTargetChannels(
        scanInteraction,
        conditionResult.channelIds,
      );
      if (!targetChannels) return;

      // 投稿者タイプ判定（既に居ない人フィルター）・プレビューの退出済み表示に使う
      // 現在のサーバーメンバーID集合をスキャン前に一括取得する
      const memberIds = await fetchGuildMemberIds(interaction.guild);

      const scannedMessages = await runScanPhase(
        scanInteraction,
        targetChannels,
        options,
        memberIds,
      );
      if (!scannedMessages) return;

      if (scannedMessages.length === 0) {
        await scanInteraction.editReply({
          embeds: [
            createInfoEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.no_messages_found",
              ),
            ),
          ],
          content: "",
        });
        return;
      }

      await runConfirmDeletePhase(scanInteraction, scannedMessages, options);
    } finally {
      // 正常完了・キャンセル・タイムアウト・エラーすべての終了パスでロックを解放
      executingGuilds.delete(guildId);
      logger.debug(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.lock_released",
          { guildId },
        ),
      );
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

// ===== 確認フェーズ + 削除実行フェーズ =====

/**
 * 確認フェーズ（Stage 1: プレビュー ↔ Stage 2: 最終確認）→ 削除実行フェーズの一連のフローを管理する
 * Stage 2 の「戻る」で Stage 1 に戻るループ構造
 * @param interaction スキャン開始ボタンの interaction（スキャン完了後も有効な token）
 * @param scannedMessages スキャン済みメッセージ配列
 * @param options パース済みコマンドオプション
 * @returns 処理完了を示す Promise
 */
async function runConfirmDeletePhase(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  scannedMessages: ScannedMessageWithChannel[],
  options: ParsedOptions,
): Promise<void> {
  // 確認フェーズ: Stage 1（プレビュー） → Stage 2（最終確認）ループ
  // Stage 2 の「戻る」で Stage 1 に戻る
  // 各ダイアログはボタン操作の deferUpdate() で fresh token を取得するため、
  // フェーズごとに独立して MSG_DEL_PHASE_TIMEOUT_MS（14分）使える
  let filter: MessageDeleteFilter = {} as MessageDeleteFilter;
  let excludedIds = new Set<string>();
  let currentBaseInteraction:
    | ChatInputCommandInteraction
    | MessageComponentInteraction = interaction;

  while (true) {
    const previewResult = await showPreviewDialog(
      currentBaseInteraction,
      scannedMessages,
      filter,
      excludedIds,
      options,
      MSG_DEL_PHASE_TIMEOUT_MS,
    );

    if (previewResult.type === DIALOG_TYPE.Timeout) return;
    if (previewResult.type === DIALOG_TYPE.Cancel) {
      await replyAsCancelled(previewResult.lastInteraction);
      return;
    }

    filter = previewResult.filter;
    excludedIds = previewResult.excludedIds;
    // フィルターは表示の絞り込みのみ（仕様）。削除対象はスキャン結果全体から除外分を差し引く
    const targetMessages = scannedMessages.filter(
      (m) => !excludedIds.has(m.messageId),
    );

    const finalResult = await showFinalConfirmDialog(
      previewResult.confirmInteraction,
      targetMessages,
      MSG_DEL_PHASE_TIMEOUT_MS,
    );

    if (finalResult.type === DIALOG_TYPE.Confirm) {
      await executeDelete(finalResult.interaction, targetMessages, options);
      return;
    }
    if (finalResult.type === DIALOG_TYPE.Back) {
      currentBaseInteraction = finalResult.interaction;
      continue;
    }
    if (finalResult.type === DIALOG_TYPE.Timeout) return;
    // cancel
    await replyAsCancelled(finalResult.interaction);
    return;
  }
}

// ===== ダイアログ共通ヘルパー =====

/**
 * キャンセル完了通知を Ephemeral で送る
 * @param interaction キャンセル操作の MessageComponentInteraction
 * @returns 処理完了を示す Promise
 */
async function replyAsCancelled(
  interaction: MessageComponentInteraction,
): Promise<void> {
  await interaction
    .editReply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            interaction.locale,
            "messageDelete:user-response.cancelled",
          ),
        ),
      ],
      components: [],
      content: "",
    })
    .catch(() => {});
}
