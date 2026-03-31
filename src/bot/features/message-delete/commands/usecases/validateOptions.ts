// src/bot/features/message-delete/commands/usecases/validateOptions.ts
// コマンドオプションのパース・バリデーション

import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { getTimezoneOffsetForLocale } from "../../../../../shared/locale/helpers";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { createWarningEmbed } from "../../../../utils/messageResponse";
import {
  MS_PER_DAY,
  MSG_DEL_COMMAND,
  MSG_DEL_DEFAULT_COUNT,
} from "../../constants/messageDeleteConstants";
import { parseDateStr } from "../../services/messageDeleteService";
import type { ParsedOptions } from "./dialogUtils";

/**
 * コマンド実行者が ManageMessages 権限を持つかどうかを確認する
 * @param interaction コマンド実行の ChatInputCommandInteraction
 * @returns ManageMessages 権限がある場合は true
 */
export function hasManageMessagesPermission(
  interaction: ChatInputCommandInteraction,
): boolean {
  // has() はデフォルトで Administrator フラグを考慮するため個別チェックは不要
  return (
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ??
    false
  );
}

/**
 * Bot がメッセージ削除に必要なグローバル権限を持つかどうかを確認する
 * @param interaction コマンド実行の ChatInputCommandInteraction
 * @returns 必要な権限（ManageMessages / ReadMessageHistory / ViewChannel）をすべて持つ場合は true
 */
export function hasBotRequiredPermissions(
  interaction: ChatInputCommandInteraction,
): boolean {
  const me = interaction.guild?.members.me;
  if (!me) return true; // me が取得できない場合はチャンネル個別チェックに委ねる
  return me.permissions.has([
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ViewChannel,
  ]);
}

/**
 * コマンドオプションをパースしてバリデーションを行う
 * @param interaction コマンド実行の ChatInputCommandInteraction
 * @returns バリデーション済みオプション（エラー時は null）
 */
export async function parseAndValidateOptions(
  interaction: ChatInputCommandInteraction,
): Promise<ParsedOptions | null> {
  const countOption = interaction.options.getInteger(
    MSG_DEL_COMMAND.OPTION.COUNT,
  );
  const keyword = interaction.options.getString(
    MSG_DEL_COMMAND.OPTION.KEYWORD,
    false,
  );
  const daysOption = interaction.options.getInteger(
    MSG_DEL_COMMAND.OPTION.DAYS,
    false,
  );
  const afterStr = interaction.options.getString(
    MSG_DEL_COMMAND.OPTION.AFTER,
    false,
  );
  const beforeStr = interaction.options.getString(
    MSG_DEL_COMMAND.OPTION.BEFORE,
    false,
  );

  // days と after/before は排他
  if (daysOption && (afterStr || beforeStr)) {
    await interaction.editReply({
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "messageDelete:user-response.days_and_date_conflict",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_option_conflict",
            ),
          },
        ),
      ],
    });
    return null;
  }

  // タイムスタンプ計算
  let afterTs = 0;
  let beforeTs = Infinity;
  const timezoneOffset = getTimezoneOffsetForLocale(interaction.locale);

  if (daysOption) {
    afterTs = Date.now() - daysOption * MS_PER_DAY;
  } else {
    if (afterStr) {
      const d = parseDateStr(afterStr, false, timezoneOffset);
      if (!d) {
        await interaction.editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.after_invalid_format",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_invalid_input",
                ),
              },
            ),
          ],
        });
        return null;
      }
      afterTs = d.getTime();
      if (afterTs > Date.now()) {
        await interaction.editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.after_future",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_invalid_input",
                ),
              },
            ),
          ],
        });
        return null;
      }
    }
    if (beforeStr) {
      const d = parseDateStr(beforeStr, true, timezoneOffset);
      if (!d) {
        await interaction.editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.before_invalid_format",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_invalid_input",
                ),
              },
            ),
          ],
        });
        return null;
      }
      beforeTs = d.getTime();
      // YYYY-MM-DD 形式の当日指定は仕様上許可（ロケールタイムゾーンの 00:00:00 が現在以前かどうかで判定）
      // 当日の 23:59:59 が未来であっても有効なため、00:00:00 で未来チェックを行う
      const checkDate = /^\d{4}-\d{2}-\d{2}$/.test(beforeStr)
        ? parseDateStr(beforeStr, false, timezoneOffset)
        : d;
      if (checkDate && checkDate.getTime() > Date.now()) {
        await interaction.editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.before_future",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_invalid_input",
                ),
              },
            ),
          ],
        });
        return null;
      }
    }
    if (afterTs !== 0 && beforeTs !== Infinity && afterTs >= beforeTs) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.date_range_invalid",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_invalid_input",
              ),
            },
          ),
        ],
      });
      return null;
    }
  }

  return {
    count: countOption ?? MSG_DEL_DEFAULT_COUNT,
    countSpecified: countOption !== null,
    targetUserIds: [],
    keyword: keyword ?? undefined,
    afterTs,
    beforeTs,
    afterStr: afterStr ?? undefined,
    beforeStr: beforeStr ?? undefined,
    daysOption: daysOption ?? undefined,
    channelIds: [],
  };
}

/**
 * スラッシュコマンドオプションでフィルタ条件が1つ以上指定されているかを判定する
 * （条件設定フェーズのバリデーションで使用）
 * @param options パース済みオプション
 * @returns フィルタ条件が1つ以上あれば true
 */
export function hasSlashCommandFilter(options: ParsedOptions): boolean {
  return !!(
    options.countSpecified ||
    options.keyword ||
    options.daysOption ||
    options.afterStr ||
    options.beforeStr
  );
}
