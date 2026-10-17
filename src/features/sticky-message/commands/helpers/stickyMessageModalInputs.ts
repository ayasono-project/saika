// sticky-message set / update のモーダル入力欄ビルダー

import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { AllParseKeys } from "../../../../shared/locale/i18n";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  formatColorHex,
  type StickyEmbedData,
} from "../../services/stickyMessagePayloadBuilder";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/** Embed タイトルの最大文字数（Discord の Embed タイトルの上限） */
const EMBED_TITLE_MAX_LENGTH = 256;
/** Embed 説明文の最大文字数（Discord のテキスト入力欄の上限） */
const EMBED_DESCRIPTION_MAX_LENGTH = 4000;
/** カラーコード入力の最大文字数（`#RRGGBB` / `0xRRGGBB` に余裕を持たせた値） */
const EMBED_COLOR_MAX_LENGTH = 20;
/** プレーンテキスト本文の最大文字数（Discord のメッセージ本文の上限） */
const MESSAGE_MAX_LENGTH = 2000;

/**
 * Embed 形式のモーダル入力欄（タイトル・カラー・説明文の3行）を組み立てる
 * @param locale 表示に使うロケール
 * @param prefill 事前入力する既存の Embed 設定（update で使う）
 * @returns モーダルに追加する行の配列
 */
export function buildStickyEmbedModalRows(
  locale: string,
  prefill: StickyEmbedData = {},
): ActionRowBuilder<TextInputBuilder>[] {
  const titleInput = new TextInputBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_TITLE)
    .setLabel(
      tInteraction(locale, "stickyMessage:ui.modal.set_embed_title_label"),
    )
    .setPlaceholder(
      tInteraction(
        locale,
        "stickyMessage:ui.modal.set_embed_title_placeholder",
      ),
    )
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(EMBED_TITLE_MAX_LENGTH);
  if (prefill.title) titleInput.setValue(prefill.title);

  const descriptionInput = new TextInputBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_DESCRIPTION)
    .setLabel(
      tInteraction(
        locale,
        "stickyMessage:ui.modal.set_embed_description_label",
      ),
    )
    .setPlaceholder(
      tInteraction(
        locale,
        "stickyMessage:ui.modal.set_embed_description_placeholder",
      ),
    )
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(EMBED_DESCRIPTION_MAX_LENGTH);
  if (prefill.description) descriptionInput.setValue(prefill.description);

  const colorInput = new TextInputBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_COLOR)
    .setLabel(
      tInteraction(locale, "stickyMessage:ui.modal.set_embed_color_label"),
    )
    .setPlaceholder(
      tInteraction(
        locale,
        "stickyMessage:ui.modal.set_embed_color_placeholder",
      ),
    )
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(EMBED_COLOR_MAX_LENGTH);
  // 0（黒）も事前入力する。空欄で送信されると既定色に戻ってしまうため
  if (prefill.color !== undefined) {
    colorInput.setValue(formatColorHex(prefill.color));
  }

  return [
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
  ];
}

/**
 * プレーンテキスト形式のモーダル入力欄（本文1行）を組み立てる
 * @param locale 表示に使うロケール
 * @param keys ラベルとプレースホルダの翻訳キー（set と update で文言が違う）
 * @param prefill 事前入力する既存の本文（update で使う・上限で切り詰める）
 * @returns モーダルに追加する行
 */
export function buildStickyMessageModalRow(
  locale: string,
  keys: { label: AllParseKeys; placeholder: AllParseKeys },
  prefill?: string,
): ActionRowBuilder<TextInputBuilder> {
  const messageInput = new TextInputBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.MESSAGE)
    .setLabel(tInteraction(locale, keys.label))
    .setPlaceholder(tInteraction(locale, keys.placeholder))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(MESSAGE_MAX_LENGTH);
  if (prefill !== undefined) {
    messageInput.setValue(prefill.substring(0, MESSAGE_MAX_LENGTH));
  }

  return new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
}
