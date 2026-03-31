// src/bot/features/message-delete/commands/usecases/dialogUtils.ts
// ダイアログ共通ユーティリティ（型定義・モーダルヘルパー）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { AllParseKeys } from "../../../../../shared/locale/i18n";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import {
  type MessageDeleteFilter,
  MSG_DEL_CUSTOM_ID,
  MSG_DEL_MODAL_TIMEOUT_MS,
} from "../../constants/messageDeleteConstants";
import { parseDateStr } from "../../services/messageDeleteService";

// ===== 型定義 =====

/** コマンドオプションのパース・バリデーション結果 */
export interface ParsedOptions {
  count: number;
  /** ユーザーが count を明示指定したかどうか（ログ出力の有無に使用） */
  countSpecified: boolean;
  /** 対象ユーザーID一覧（条件設定フェーズで選択、空配列で全員対象） */
  targetUserIds: string[];
  keyword?: string;
  afterTs: number;
  beforeTs: number;
  afterStr?: string;
  beforeStr?: string;
  daysOption?: number;
  /** 対象チャンネルID一覧（条件設定フェーズで選択、空配列でサーバー全体） */
  channelIds: string[];
}

/** モーダルフィルター設定 */
export interface ModalFilterConfig {
  readonly modalId: string;
  readonly inputId: string;
  readonly titleKey: AllParseKeys;
  readonly labelKey: AllParseKeys;
  readonly placeholderKey: AllParseKeys;
  readonly apply: (
    value: string,
    current: MessageDeleteFilter,
    timezoneOffset: string,
  ) => { filter: MessageDeleteFilter; errorKey?: AllParseKeys };
}

export const DIALOG_TYPE = {
  Confirm: "confirm",
  Cancel: "cancel",
  Timeout: "timeout",
  Back: "back",
} as const;

export type PreviewResult =
  | {
      type: typeof DIALOG_TYPE.Cancel;
      lastInteraction: MessageComponentInteraction;
    }
  | { type: typeof DIALOG_TYPE.Timeout }
  | {
      type: typeof DIALOG_TYPE.Confirm;
      filter: MessageDeleteFilter;
      excludedIds: Set<string>;
      confirmInteraction: MessageComponentInteraction;
    };

export type FinalResult =
  | {
      type: typeof DIALOG_TYPE.Confirm;
      interaction: MessageComponentInteraction;
    }
  | {
      type: typeof DIALOG_TYPE.Cancel;
      interaction: MessageComponentInteraction;
    }
  | { type: typeof DIALOG_TYPE.Timeout }
  | { type: typeof DIALOG_TYPE.Back; interaction: MessageComponentInteraction };

// ===== モーダルフィルター設定マップ =====

export const MODAL_FILTER_CONFIG: Map<string, ModalFilterConfig> = new Map<
  string,
  ModalFilterConfig
>([
  [
    MSG_DEL_CUSTOM_ID.FILTER_KEYWORD,
    {
      modalId: MSG_DEL_CUSTOM_ID.MODAL_KEYWORD,
      inputId: MSG_DEL_CUSTOM_ID.MODAL_INPUT_KEYWORD,
      titleKey: "messageDelete:ui.modal.keyword_title",
      labelKey: "messageDelete:ui.modal.keyword_label",
      placeholderKey: "messageDelete:ui.modal.keyword_placeholder",
      apply: (value, current) => ({
        filter: { ...current, keyword: value || undefined },
      }),
    },
  ],
  [
    MSG_DEL_CUSTOM_ID.FILTER_DAYS,
    {
      modalId: MSG_DEL_CUSTOM_ID.MODAL_DAYS,
      inputId: MSG_DEL_CUSTOM_ID.MODAL_INPUT_DAYS,
      titleKey: "messageDelete:ui.modal.days_title",
      labelKey: "messageDelete:ui.modal.days_label",
      placeholderKey: "messageDelete:ui.modal.days_placeholder",
      apply: (value, current) => {
        if (!value) return { filter: { ...current, days: undefined } };
        const days = parseInt(value, 10);
        if (isNaN(days) || days < 1) {
          return {
            filter: current,
            errorKey: "messageDelete:user-response.days_invalid_value" as const,
          };
        }
        return {
          filter: { ...current, days, after: undefined, before: undefined },
        };
      },
    },
  ],
  [
    MSG_DEL_CUSTOM_ID.FILTER_AFTER,
    {
      modalId: MSG_DEL_CUSTOM_ID.MODAL_AFTER,
      inputId: MSG_DEL_CUSTOM_ID.MODAL_INPUT_AFTER,
      titleKey: "messageDelete:ui.modal.after_title",
      labelKey: "messageDelete:ui.modal.after_label",
      placeholderKey: "messageDelete:ui.modal.after_placeholder",
      apply: (value, current, timezoneOffset) => {
        if (!value) return { filter: { ...current, after: undefined } };
        const afterDate = parseDateStr(value, false, timezoneOffset);
        if (!afterDate) {
          return {
            filter: current,
            errorKey:
              "messageDelete:user-response.after_invalid_format" as const,
          };
        }
        if (current.before && afterDate >= current.before) {
          return {
            filter: current,
            errorKey: "messageDelete:user-response.date_range_invalid" as const,
          };
        }
        // afterRaw: ボタンラベルにユーザー入力値をそのまま表示するために保存
        return {
          filter: {
            ...current,
            after: afterDate,
            afterRaw: value,
            days: undefined,
          },
        };
      },
    },
  ],
  [
    MSG_DEL_CUSTOM_ID.FILTER_BEFORE,
    {
      modalId: MSG_DEL_CUSTOM_ID.MODAL_BEFORE,
      inputId: MSG_DEL_CUSTOM_ID.MODAL_INPUT_BEFORE,
      titleKey: "messageDelete:ui.modal.before_title",
      labelKey: "messageDelete:ui.modal.before_label",
      placeholderKey: "messageDelete:ui.modal.before_placeholder",
      apply: (value, current, timezoneOffset) => {
        if (!value) return { filter: { ...current, before: undefined } };
        const beforeDate = parseDateStr(value, true, timezoneOffset);
        if (!beforeDate) {
          return {
            filter: current,
            errorKey:
              "messageDelete:user-response.before_invalid_format" as const,
          };
        }
        if (current.after && current.after >= beforeDate) {
          return {
            filter: current,
            errorKey: "messageDelete:user-response.date_range_invalid" as const,
          };
        }
        // beforeRaw: ボタンラベルにユーザー入力値をそのまま表示するために保存
        return {
          filter: {
            ...current,
            before: beforeDate,
            beforeRaw: value,
            days: undefined,
          },
        };
      },
    },
  ],
]);

// ===== モーダルヘルパー =====

/**
 * フィルターモーダルを表示してユーザーの入力値を返す
 * @param i モーダルを表示するトリガーの MessageComponentInteraction
 * @param config モーダルの設定（タイトル・ラベル・プレースホルダー等）
 * @returns ユーザーの入力値（トリム済み）、キャンセル/タイムアウト時は null
 */
export async function showFilterModal(
  i: MessageComponentInteraction,
  config: ModalFilterConfig,
): Promise<string | null> {
  const modal = new ModalBuilder()
    .setCustomId(config.modalId)
    .setTitle(tInteraction(i.locale, config.titleKey))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(config.inputId)
          .setLabel(tInteraction(i.locale, config.labelKey))
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder(tInteraction(i.locale, config.placeholderKey)),
      ),
    );

  await i.showModal(modal);
  const submit = await i
    .awaitModalSubmit({ time: MSG_DEL_MODAL_TIMEOUT_MS })
    .catch(() => null);
  if (!submit) return null;
  await submit.deferUpdate();
  return submit.fields.getTextInputValue(config.inputId).trim();
}

/**
 * モーダル入力値を MODAL_FILTER_CONFIG に基づいてフィルターに適用する
 * @param customId ボタンの customId（フィルター種別を特定するために使用）
 * @param value モーダルに入力された値
 * @param currentFilter 現在のフィルター状態
 * @param timezoneOffset 日付パース時に使用するタイムゾーンオフセット
 * @returns 新しいフィルター状態（エラーの場合は errorKey を含む）
 */
export function applyModalFilterValue(
  customId: string,
  value: string,
  currentFilter: MessageDeleteFilter,
  timezoneOffset: string,
): { filter: MessageDeleteFilter; errorKey?: AllParseKeys } {
  return (
    MODAL_FILTER_CONFIG.get(customId)?.apply(
      value,
      currentFilter,
      timezoneOffset,
    ) ?? {
      filter: currentFilter,
    }
  );
}

/**
 * ページジャンプモーダルを表示してユーザーの入力文字列を返す
 * @param i モーダルを表示するトリガーの MessageComponentInteraction
 * @param totalPages 総ページ数（プレースホルダーに使用）
 * @returns ユーザーの入力文字列（トリム済み）、キャンセル/タイムアウト時は null
 */
export async function showJumpModal(
  i: MessageComponentInteraction | ChatInputCommandInteraction,
  totalPages: number,
): Promise<string | null> {
  const modal = new ModalBuilder()
    .setCustomId(MSG_DEL_CUSTOM_ID.MODAL_JUMP)
    .setTitle(tInteraction(i.locale, "messageDelete:ui.modal.jump_title"))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(MSG_DEL_CUSTOM_ID.MODAL_INPUT_JUMP)
          .setLabel(tInteraction(i.locale, "messageDelete:ui.modal.jump_label"))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder(
            tInteraction(i.locale, "messageDelete:ui.modal.jump_placeholder", {
              total: totalPages,
            }),
          ),
      ),
    );

  await i.showModal(modal);
  const submit = await i
    .awaitModalSubmit({ time: MSG_DEL_MODAL_TIMEOUT_MS })
    .catch(() => null);
  if (!submit) return null;
  await submit.deferUpdate();
  return submit.fields
    .getTextInputValue(MSG_DEL_CUSTOM_ID.MODAL_INPUT_JUMP)
    .trim();
}
