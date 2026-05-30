// src/bot/shared/embedPaginator.ts
// 事前レンダリング済み Embed ページをコレクターでめくる共通ページネーター
//
// インメモリのコレクターで管理するため、Bot 再起動でボタンは失効する（押下は無視される）。
// customId は固定サフィックスのみで再生成 ID を埋めない（メッセージに紐づくコレクターで解決）。

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
  type Message,
  type MessageComponentInteraction,
} from "discord.js";

/** ページネーションボタンの customId サフィックス */
const PAGE = {
  FIRST: "page-first",
  PREV: "page-prev",
  INDICATOR: "page-indicator",
  NEXT: "page-next",
  LAST: "page-last",
} as const;

/**
 * ナビゲーション行を構築する（first / prev / 表示 / next / last）。
 * 中央の表示はロケール非依存の数値（`1 / 3`）。
 * @param prefix customId プレフィックス
 * @param page 現在ページ（0-indexed）
 * @param totalPages 総ページ数
 */
function buildNavRow(
  prefix: string,
  page: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE.FIRST}`)
      .setEmoji("⏮")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE.PREV}`)
      .setEmoji("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE.INDICATOR}`)
      .setLabel(`${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE.NEXT}`)
      .setEmoji("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${PAGE.LAST}`)
      .setEmoji("⏭")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

/** 押されたナビゲーションボタンから新しいページ番号を解決する */
function resolvePage(
  customId: string,
  prefix: string,
  current: number,
  totalPages: number,
): number | null {
  switch (customId) {
    case `${prefix}:${PAGE.FIRST}`:
      return 0;
    case `${prefix}:${PAGE.PREV}`:
      return Math.max(0, current - 1);
    case `${prefix}:${PAGE.NEXT}`:
      return Math.min(totalPages - 1, current + 1);
    case `${prefix}:${PAGE.LAST}`:
      return totalPages - 1;
    default:
      return null;
  }
}

/** ページネーター送信オプション */
export interface SendPaginatedEmbedsOptions {
  /** 最初のメッセージを送信する関数（戻り値の Message にコレクターを張る） */
  send: (payload: {
    content?: string;
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
    allowedMentions?: { roles?: string[] };
  }) => Promise<Message>;
  pages: EmbedBuilder[];
  prefix: string;
  /** コレクターの有効時間（ms） */
  timeMs: number;
  /** 操作を許可するユーザー ID（preview 用。未指定なら誰でも操作可） */
  filterUserId?: string;
  /** 1 ページ目に付与するメッセージ本文（対象ロールメンション等） */
  content?: string;
  /** 本文メンションのピング許可対象ロール */
  allowedMentionRoleIds?: string[];
}

/**
 * 事前レンダリング済みの Embed ページ群を送信し、複数ページならコレクターでページ送りを可能にする。
 * @param options 送信オプション
 * @returns 送信したメッセージ
 */
export async function sendPaginatedEmbeds(
  options: SendPaginatedEmbedsOptions,
): Promise<Message> {
  const { send, pages, prefix, timeMs } = options;
  const totalPages = pages.length;
  let currentPage = 0;

  const components = totalPages > 1 ? [buildNavRow(prefix, 0, totalPages)] : [];

  const message = await send({
    content: options.content,
    embeds: [pages[0]],
    components,
    ...(options.allowedMentionRoleIds
      ? { allowedMentions: { roles: options.allowedMentionRoleIds } }
      : {}),
  });

  // 単一ページならコレクター不要
  if (totalPages <= 1) return message;

  const collector = message.createMessageComponentCollector({ time: timeMs });

  /* istanbul ignore next -- Discord.js collector callback */
  collector.on("collect", async (interaction: MessageComponentInteraction) => {
    // preview 等で操作者を限定する場合
    if (options.filterUserId && interaction.user.id !== options.filterUserId) {
      return;
    }
    const next = resolvePage(
      interaction.customId,
      prefix,
      currentPage,
      totalPages,
    );
    if (next === null) return;
    currentPage = next;
    await interaction.update({
      embeds: [pages[currentPage]],
      components: [buildNavRow(prefix, currentPage, totalPages)],
    });
  });

  return message;
}
