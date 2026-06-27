// src/bot/shared/notificationSender.ts
// 通知送信共通ユーティリティ（コンテンツ先行 → Embed パック送信）

import type { EmbedBuilder, MessageCreateOptions } from "discord.js";

const MAX_EMBEDS_PER_MESSAGE = 10;
const MAX_EMBED_CHARS_PER_MESSAGE = 6000;
const MAX_CONTENT_LENGTH = 2000;

/** Embed のおおよその文字数を推定する（フィールド名・値・タイトル・説明等を合算） */
function estimateEmbedChars(embed: EmbedBuilder): number {
  const data = embed.data;
  let count = 0;
  if (data.title) count += data.title.length;
  if (data.description) count += data.description.length;
  if (data.author?.name) count += data.author.name.length;
  if (data.footer?.text) count += data.footer.text.length;
  for (const field of data.fields ?? []) {
    count += field.name.length + field.value.length;
  }
  return count;
}

/** コンテンツ文字列を 2000 文字以内になるようにホワイトスペース境界で分割する */
function splitContent(content: string): string[] {
  if (content.length <= MAX_CONTENT_LENGTH) return [content];
  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > MAX_CONTENT_LENGTH) {
    const window = remaining.slice(0, MAX_CONTENT_LENGTH);
    const splitAt = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n"));
    if (splitAt <= 0) {
      // ホワイトスペースなし（トークンが極端に長い）場合のみハードカット
      chunks.push(remaining.slice(0, MAX_CONTENT_LENGTH));
      remaining = remaining.slice(MAX_CONTENT_LENGTH);
    } else {
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt + 1);
    }
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Embed 一覧を 1 メッセージあたり最大 10 件・6000 文字以内になるようにグループ化する。
 */
function groupEmbeds(embeds: EmbedBuilder[]): EmbedBuilder[][] {
  const batches: EmbedBuilder[][] = [];
  let currentBatch: EmbedBuilder[] = [];
  let currentChars = 0;

  for (const embed of embeds) {
    const embedChars = estimateEmbedChars(embed);
    if (
      currentBatch.length >= MAX_EMBEDS_PER_MESSAGE ||
      (currentBatch.length > 0 &&
        currentChars + embedChars > MAX_EMBED_CHARS_PER_MESSAGE)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push(embed);
    currentChars += embedChars;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

export interface SendNotificationResult {
  /** 最初のメッセージが送信成功したか（warnStage 前進判定に使う） */
  firstMessageSent: boolean;
}

/**
 * 通知を送信する（コンテンツ先行 → Embed パック）。
 *
 * 1. `content` を 2000 文字ずつ分割して順番に送信する
 * 2. Embed を最大 10 件・6000 文字でグループ化し、各グループに "(p / M)" フッターを付けて送信する
 * 3. 最初のメッセージ（コンテンツまたは Embed）の送信成功で `firstMessageSent: true` を返す
 *    — 以後のメッセージ送信失敗は非致命的（ログのみ）
 *
 * @param send チャンネルへの送信関数
 * @param payload コンテンツ・Embed・allowedMentions
 */
export async function sendNotification(
  send: (payload: MessageCreateOptions) => Promise<unknown>,
  payload: {
    content?: string;
    embeds: EmbedBuilder[];
    allowedMentions?: MessageCreateOptions["allowedMentions"];
  },
): Promise<SendNotificationResult> {
  const contentChunks = payload.content ? splitContent(payload.content) : [];
  const embedBatches = groupEmbeds(payload.embeds);

  if (contentChunks.length === 0 && embedBatches.length === 0) {
    return { firstMessageSent: false };
  }

  // 全 Embed にページフッターを付与（メッセージ単位ではなく embed 単位で連番）
  const allEmbeds = embedBatches.flat();
  const totalEmbeds = allEmbeds.length;
  if (totalEmbeds > 1) {
    allEmbeds.forEach((embed, i) => {
      embed.setFooter({ text: `${i + 1} / ${totalEmbeds}` });
    });
  }

  let firstMessageSent = false;

  // コンテンツチャンクを先に送信
  for (let i = 0; i < contentChunks.length; i++) {
    try {
      await send({
        content: contentChunks[i],
        allowedMentions: payload.allowedMentions,
      });
      firstMessageSent = true;
    } catch {
      if (i === 0) return { firstMessageSent: false };
      // 2枚目以降のコンテンツ送信失敗は非致命的
    }
  }

  // Embed バッチを送信
  for (let i = 0; i < embedBatches.length; i++) {
    try {
      await send({
        embeds: embedBatches[i],
        allowedMentions: payload.allowedMentions,
      });
      firstMessageSent = true;
    } catch {
      if (i === 0 && !firstMessageSent) return { firstMessageSent: false };
      // 2枚目以降の Embed 送信失敗は非致命的
    }
  }

  return { firstMessageSent };
}
