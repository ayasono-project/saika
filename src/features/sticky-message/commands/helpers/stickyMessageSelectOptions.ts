// sticky-message view / remove のチャンネル選択肢ビルダー

import { type Guild, StringSelectMenuOptionBuilder } from "discord.js";
import type { StickyMessage } from "../../repositories/types";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/** 選択肢の説明欄に出す本文プレビューの最大文字数 */
const PREVIEW_MAX_LENGTH = 50;

/**
 * 設定済みのスティッキーメッセージを、チャンネル名と本文プレビューの選択肢にする（Discord の上限件数まで）
 * @param guild チャンネル名を引くギルド（キャッシュに無ければ ID を表示する）
 * @param stickies ギルドのスティッキーメッセージ設定
 * @returns StringSelectMenu に渡す選択肢
 */
export function buildStickySelectOptions(
  guild: Guild | null,
  stickies: StickyMessage[],
): StringSelectMenuOptionBuilder[] {
  return stickies
    .slice(0, STICKY_MESSAGE_COMMAND.MAX_SELECT_OPTIONS)
    .map((sticky) => {
      // キャッシュからチャンネル名を取得し、未キャッシュ時は ID をフォールバックとして使う
      const channel = guild?.channels.cache.get(sticky.channelId);
      const label = channel ? `#${channel.name}` : `#${sticky.channelId}`;
      const preview =
        sticky.content.length > PREVIEW_MAX_LENGTH
          ? `${sticky.content.substring(0, PREVIEW_MAX_LENGTH)}...`
          : sticky.content;

      return new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(sticky.channelId)
        .setDescription(preview);
    });
}
