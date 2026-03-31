// src/bot/features/reaction-role/services/reactionRolePanelBuilder.ts
// リアクションロールパネルのEmbed・ボタン構築ユーティリティ

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  EmbedBuilder,
  ModalBuilder,
  type TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { ReactionRoleButton } from "../../../../shared/database/types/reactionRoleTypes";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  isValidEmoji,
  normalizeEmoji,
  REACTION_ROLE_BUTTONS_PER_ROW,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_DEFAULT_BUTTON_STYLE,
} from "../commands/reactionRoleCommand.constants";

/** ボタンスタイル文字列から discord.js ButtonStyle への変換マップ */
const STYLE_MAP: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

/**
 * パネル Embed を構築する
 * @param title パネルタイトル
 * @param description パネル説明文
 * @param color カラーコード（#RRGGBB形式）
 */
export function buildPanelEmbed(
  title: string,
  description: string,
  color: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(Number.parseInt(color.slice(1), 16));
}

/**
 * パネルボタンの ActionRow 配列を構築する
 * @param panelId パネルID
 * @param buttons ボタン設定配列
 * @returns ActionRow 配列（5個ずつグループ化）
 */
export function buildPanelButtonRows(
  panelId: string,
  buttons: ReactionRoleButton[],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < buttons.length; i += REACTION_ROLE_BUTTONS_PER_ROW) {
    const chunk = buttons.slice(i, i + REACTION_ROLE_BUTTONS_PER_ROW);
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (const btn of chunk) {
      const builder = new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.CLICK_PREFIX}${panelId}:${btn.buttonId}`,
        )
        .setLabel(btn.label)
        .setStyle(STYLE_MAP[btn.style.toLowerCase()] ?? ButtonStyle.Primary);

      if (btn.emoji) {
        const normalized = normalizeEmoji(btn.emoji);
        if (isValidEmoji(normalized)) {
          builder.setEmoji(normalized);
        }
      }

      row.addComponents(builder);
    }

    rows.push(row);
  }

  return rows;
}

/**
 * 設置済みパネルメッセージの Embed・ボタンを更新する
 *
 * チャンネルやメッセージが既に削除されている場合は静かに失敗する。
 * @param client Discord クライアント
 * @param channelId パネルが設置されたチャンネルID
 * @param messageId パネルメッセージID
 * @param panelId パネルID
 * @param title パネルタイトル
 * @param description パネル説明文
 * @param color パネルカラー
 * @param buttons パネルのボタン設定配列
 * @returns メッセージ更新に成功した場合 true、メッセージが存在しない場合 false
 */
export async function updatePanelMessage(
  client: Client,
  channelId: string,
  messageId: string,
  panelId: string,
  title: string,
  description: string,
  color: string,
  buttons: ReactionRoleButton[],
): Promise<boolean> {
  try {
    // キャッシュではなく fetch でチャンネルを取得
    const channel = (await client.channels
      .fetch(channelId)
      .catch(() => null)) as TextChannel | null;
    if (!channel) return false;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return false;

    const panelEmbed = buildPanelEmbed(title, description, color);
    const buttonRows = buildPanelButtonRows(panelId, buttons);
    await message.edit({ embeds: [panelEmbed], components: buttonRows });
    return true;
  } catch {
    // チャンネル/メッセージが削除済みの場合
    return false;
  }
}

/**
 * ボタン設定モーダルを構築する
 * @param customIdPrefix モーダルカスタムIDのプレフィックス
 * @param sessionId セッション識別子
 * @param locale ユーザーのロケール
 * @param prefill 既存値を事前入力するためのオブジェクト（編集時に使用）
 * @returns 構築されたModalBuilder
 */
export function buildButtonSettingsModal(
  customIdPrefix: string,
  sessionId: string,
  locale: string,
  prefill?: { label: string; emoji: string; style: string },
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${customIdPrefix}${sessionId}`)
    .setTitle(
      tInteraction(locale, "reactionRole:ui.modal.button_settings_title"),
    )
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_LABEL)
          .setLabel(
            tInteraction(locale, "reactionRole:ui.modal.button_field_label"),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
          .setValue(prefill?.label ?? ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_EMOJI)
          .setLabel(
            tInteraction(locale, "reactionRole:ui.modal.button_field_emoji"),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(prefill?.emoji ?? ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(REACTION_ROLE_CUSTOM_ID.BUTTON_STYLE)
          .setLabel(
            tInteraction(locale, "reactionRole:ui.modal.button_field_style"),
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(prefill?.style ?? REACTION_ROLE_DEFAULT_BUTTON_STYLE),
      ),
    );
}
