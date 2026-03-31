// src/bot/features/vc-panel/vcControlPanel.ts
// VC操作パネルの送信ユーティリティ（VAC・VC募集などVC自動作成機能で共用）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type VoiceChannel,
} from "discord.js";
import { tGuild } from "../../../shared/locale/localeManager";
import { createInfoEmbed } from "../../utils/messageResponse";

// VC操作パネルのボタン/モーダル/入力識別に使う customId 定数
// 既存の Discord パネルとの互換性維持のため `vac:` プレフィックスを継続使用
export const VAC_PANEL_CUSTOM_ID = {
  RENAME_BUTTON_PREFIX: "vac:rename:",
  LIMIT_BUTTON_PREFIX: "vac:limit:",
  AFK_BUTTON_PREFIX: "vac:afk:",
  REFRESH_BUTTON_PREFIX: "vac:refresh:",
  RENAME_MODAL_PREFIX: "vac:rename-modal:",
  LIMIT_MODAL_PREFIX: "vac:limit-modal:",
  AFK_SELECT_PREFIX: "vac:afk-select:",
  RENAME_INPUT: "vac:rename-input",
  LIMIT_INPUT: "vac:limit-input",
} as const;

/**
 * VC操作パネル customId から対象ボイスチャンネル ID を抽出する関数
 * @param customId 判定対象の customId
 * @param prefix 対象とする customId プレフィックス
 * @returns 解決したチャンネルID（不一致時は空文字）
 */
export function getVacPanelChannelId(customId: string, prefix: string): string {
  // 想定prefix以外は空文字を返し、呼び出し側で不正IDとして扱う
  return customId.startsWith(prefix) ? customId.slice(prefix.length) : "";
}

/**
 * VC操作パネルメッセージを対象ボイスチャンネルへ送信する関数
 * @param voiceChannel 送信先ボイスチャンネル
 * @returns 実行完了を示す Promise
 */
export async function sendVcControlPanel(
  voiceChannel: VoiceChannel,
): Promise<void> {
  // VoiceChannel でも send 不可な状態（権限不足など）は送信しない
  if (!voiceChannel.isTextBased() || !voiceChannel.isSendable()) {
    return;
  }

  const guildId = voiceChannel.guild.id;
  // 表示文言は送信先 guild のロケールで都度解決
  const title = await tGuild(guildId, "vac:embed.title.panel");
  const description = await tGuild(guildId, "vac:embed.description.panel");

  const renameLabel = await tGuild(guildId, "vac:ui.button.rename");
  const limitLabel = await tGuild(guildId, "vac:ui.button.limit");
  const afkLabel = await tGuild(guildId, "vac:ui.button.afk");
  const refreshLabel = await tGuild(guildId, "vac:ui.button.refresh");

  const embed = createInfoEmbed(description, { title });

  const renameRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX}${voiceChannel.id}`,
      )
      .setLabel(renameLabel)
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
  );

  const limitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${VAC_PANEL_CUSTOM_ID.LIMIT_BUTTON_PREFIX}${voiceChannel.id}`,
      )
      .setLabel(limitLabel)
      .setEmoji("👥")
      .setStyle(ButtonStyle.Primary),
  );

  const afkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${VAC_PANEL_CUSTOM_ID.AFK_BUTTON_PREFIX}${voiceChannel.id}`)
      .setLabel(afkLabel)
      .setEmoji("🔇")
      .setStyle(ButtonStyle.Primary),
  );

  const refreshRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${VAC_PANEL_CUSTOM_ID.REFRESH_BUTTON_PREFIX}${voiceChannel.id}`,
      )
      .setLabel(refreshLabel)
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary),
  );

  await voiceChannel.send({
    embeds: [embed],
    components: [renameRow, limitRow, afkRow, refreshRow],
  });
}
