// src/bot/features/bump-reminder/handlers/ui/bumpPanelButtonHandler.ts
// Bumpパネルの通知ON/OFFボタン処理

import { type ButtonInteraction, MessageFlags } from "discord.js";
import {
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
} from "../../../../../shared/features/bump-reminder/bumpReminderConfigService";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotBumpReminderConfigService } from "../../../../services/botCompositionRoot";
import { safeReply } from "../../../../utils/interaction";
import {
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { BUMP_CONSTANTS } from "../../constants/bumpReminderConstants";

// Bump パネルの通知 ON/OFF ボタン操作を処理する UI ハンドラー
export const bumpPanelButtonHandler: ButtonHandler = {
  /**
   * ハンドラー対象の customId かを判定する
   * @param customId 判定対象の customId
   * @returns Bump パネルの ON/OFF ボタンなら true
   */
  matches(customId: string) {
    // ON/OFF ボタンの customId プレフィックスを処理対象とする
    // 設定UI以外のボタンと衝突しないよう prefix で厳密判定する
    return (
      customId.startsWith(BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_ON) ||
      customId.startsWith(BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_OFF)
    );
  },

  /**
   * Bump パネルの通知 ON/OFF ボタン操作を実行する
   * ON ボタン: 未登録なら登録、登録済みでも成功応答（冪等）
   * OFF ボタン: 登録済みなら解除、未登録でも成功応答（冪等）
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    try {
      const customId = interaction.customId;

      // ON/OFF のどちらのボタンか判定し、guildId を取り出す
      const isOnButton = customId.startsWith(
        BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_ON,
      );
      const prefix = isOnButton
        ? BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_ON
        : BUMP_CONSTANTS.CUSTOM_ID_PREFIX.MENTION_OFF;
      // customId の残部を対象 guildId として取り出す
      // guildId を customId に含めることで cross-guild 誤操作を抑制
      const guildId = customId.slice(prefix.length);

      // 他ギルド由来のボタン再利用を防止
      if (!interaction.guild || interaction.guild.id !== guildId) {
        // customId の guild と実行 guild が一致しない操作は拒否
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "bumpReminder:user-response.panel_update_failed",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_operation_error",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const bumpReminderConfigService = getBotBumpReminderConfigService();
      const userId = interaction.user.id;
      // 成功系レスポンスで使う共通タイトル
      const successTitle = tInteraction(
        interaction.locale,
        "common:embed.title.success",
      );

      if (isOnButton) {
        // ON ボタン: 追加を試み、冪等に成功応答を返す
        const addResult =
          await bumpReminderConfigService.addBumpReminderMentionUser(
            guildId,
            userId,
          );

        if (
          addResult === BUMP_REMINDER_MENTION_USER_ADD_RESULT.NOT_CONFIGURED
        ) {
          // 設定未初期化時はwarningで通知
          await safeReply(interaction, {
            embeds: [
              createWarningEmbed(
                tInteraction(
                  interaction.locale,
                  "bumpReminder:user-response.panel_update_failed",
                ),
                {
                  title: tInteraction(
                    interaction.locale,
                    "common:title_not_configured",
                  ),
                },
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // ADDED / ALREADY_EXISTS どちらでも同じ成功応答（冪等）
        await safeReply(interaction, {
          embeds: [
            createSuccessEmbed(
              tInteraction(
                interaction.locale,
                "bumpReminder:user-response.panel_mention_toggled_on",
              ),
              { title: successTitle },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        logger.debug(
          logPrefixed(
            "system:log_prefix.bump_reminder",
            "bumpReminder:log.panel_mention_updated",
            {
              action: "on",
              userId,
              guildId,
            },
          ),
        );
      } else {
        // OFF ボタン: 削除を試み、冪等に成功応答を返す
        const removeResult =
          await bumpReminderConfigService.removeBumpReminderMentionUser(
            guildId,
            userId,
          );

        if (
          removeResult ===
          BUMP_REMINDER_MENTION_USER_REMOVE_RESULT.NOT_CONFIGURED
        ) {
          // 設定未初期化時はwarningで通知
          await safeReply(interaction, {
            embeds: [
              createWarningEmbed(
                tInteraction(
                  interaction.locale,
                  "bumpReminder:user-response.panel_update_failed",
                ),
                {
                  title: tInteraction(
                    interaction.locale,
                    "common:title_not_configured",
                  ),
                },
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // REMOVED / NOT_FOUND どちらでも同じ成功応答（冪等）
        await safeReply(interaction, {
          embeds: [
            createSuccessEmbed(
              tInteraction(
                interaction.locale,
                "bumpReminder:user-response.panel_mention_toggled_off",
              ),
              { title: successTitle },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        logger.debug(
          logPrefixed(
            "system:log_prefix.bump_reminder",
            "bumpReminder:log.panel_mention_updated",
            {
              action: "off",
              userId,
              guildId,
            },
          ),
        );
      }
    } catch (error) {
      // 想定外エラーはログ化し、ユーザーには汎用エラーを返す
      logger.error(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.panel_handle_failed",
        ),
        error,
      );
      try {
        await safeReply(interaction, {
          embeds: [
            createErrorEmbed(
              tInteraction(
                interaction.locale,
                "bumpReminder:user-response.panel_update_failed",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_operation_error",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error(
          logPrefixed(
            "system:log_prefix.bump_reminder",
            "bumpReminder:log.panel_reply_failed",
          ),
          replyError,
        );
      }
    }
  },
};
