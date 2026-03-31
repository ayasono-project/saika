// src/bot/shared/pagination.ts
// 機能横断ページネーション共通関数

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageComponentInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../shared/locale/localeManager";

/** ページネーション用の customId サフィックス */
const PAGE_SUFFIX = {
  FIRST: "page-first",
  PREV: "page-prev",
  JUMP: "page-jump",
  NEXT: "page-next",
  LAST: "page-last",
  JUMP_MODAL: "page-jump-modal",
  JUMP_INPUT: "page-jump-input",
} as const;

/** モーダル応答の待機時間（ms） */
const MODAL_TIMEOUT_MS = 30_000;

/**
 * ページネーション用5ボタン行を生成する
 *
 * customId は `${prefix}:${suffix}` 形式で生成される。
 * 単ページ時は呼び出し側で行ごと非表示にすること。
 *
 * @param prefix customId のプレフィックス（例: "bump-reminder", "message-delete"）
 * @param currentPage 現在のページ番号（0-indexed）
 * @param totalPages 総ページ数
 * @param locale interaction.locale
 * @returns ナビゲーション用 ActionRow
 */
export function buildPaginationRow(
  prefix: string,
  currentPage: number,
  totalPages: number,
  locale: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE_SUFFIX.FIRST}`)
      .setEmoji("⏮")
      .setLabel(tInteraction(locale, "common:ui.button.page_first"))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE_SUFFIX.PREV}`)
      .setEmoji("◀")
      .setLabel(tInteraction(locale, "common:ui.button.page_prev"))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE_SUFFIX.JUMP}`)
      .setLabel(
        tInteraction(locale, "common:ui.button.page_jump", {
          page: currentPage + 1,
          total: Math.max(1, totalPages),
        }),
      )
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalPages <= 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE_SUFFIX.NEXT}`)
      .setEmoji("▶")
      .setLabel(tInteraction(locale, "common:ui.button.page_next"))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE_SUFFIX.LAST}`)
      .setEmoji("⏭")
      .setLabel(tInteraction(locale, "common:ui.button.page_last"))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );
}

/**
 * ページジャンプモーダルを表示し、入力されたページ番号を返す
 *
 * @param interaction ジャンプボタンが押された際の MessageComponentInteraction
 * @param prefix customId のプレフィックス
 * @param totalPages 総ページ数
 * @param locale interaction.locale
 * @returns 入力された値の文字列（モーダルがキャンセルされた場合は null）
 */
export async function showPaginationJumpModal(
  interaction: MessageComponentInteraction,
  prefix: string,
  totalPages: number,
  locale: string,
): Promise<string | null> {
  const modal = new ModalBuilder()
    .setCustomId(`${prefix}:${PAGE_SUFFIX.JUMP_MODAL}`)
    .setTitle(tInteraction(locale, "common:ui.modal.page_jump_title"))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${prefix}:${PAGE_SUFFIX.JUMP_INPUT}`)
          .setLabel(tInteraction(locale, "common:ui.modal.page_jump_label"))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder(
            tInteraction(locale, "common:ui.modal.page_jump_placeholder", {
              total: totalPages,
            }),
          ),
      ),
    );

  await interaction.showModal(modal);
  const submit = await interaction
    .awaitModalSubmit({ time: MODAL_TIMEOUT_MS })
    .catch(() => null);
  if (!submit) return null;
  await submit.deferUpdate();
  return submit.fields
    .getTextInputValue(`${prefix}:${PAGE_SUFFIX.JUMP_INPUT}`)
    .trim();
}

/**
 * ページネーションの customId かどうかを判定し、該当するアクションを返す
 *
 * @param customId インタラクションの customId
 * @param prefix 期待する customId プレフィックス
 * @returns ページネーションアクション名（該当しない場合は null）
 */
export function parsePaginationAction(
  customId: string,
  prefix: string,
): "first" | "prev" | "jump" | "next" | "last" | null {
  const mapping: Record<string, "first" | "prev" | "jump" | "next" | "last"> = {
    [`${prefix}:${PAGE_SUFFIX.FIRST}`]: "first",
    [`${prefix}:${PAGE_SUFFIX.PREV}`]: "prev",
    [`${prefix}:${PAGE_SUFFIX.JUMP}`]: "jump",
    [`${prefix}:${PAGE_SUFFIX.NEXT}`]: "next",
    [`${prefix}:${PAGE_SUFFIX.LAST}`]: "last",
  };
  return mapping[customId] ?? null;
}

/**
 * ページネーションアクションに基づいて新しいページ番号を計算する
 *
 * @param action ページネーションアクション
 * @param currentPage 現在のページ番号（0-indexed）
 * @param totalPages 総ページ数
 * @returns 新しいページ番号（0-indexed）
 */
export function resolvePageFromAction(
  action: "first" | "prev" | "next" | "last",
  currentPage: number,
  totalPages: number,
): number {
  switch (action) {
    case "first":
      return 0;
    case "prev":
      return Math.max(0, currentPage - 1);
    case "next":
      return Math.min(totalPages - 1, currentPage + 1);
    case "last":
      return Math.max(0, totalPages - 1);
  }
}
