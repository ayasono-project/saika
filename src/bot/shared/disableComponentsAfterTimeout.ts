// src/bot/shared/disableComponentsAfterTimeout.ts
// 指定時間後にインタラクション返信のコンポーネントを一括無効化するユーティリティ

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type MessageActionRowComponentBuilder,
} from "discord.js";

/**
 * 指定ミリ秒後にインタラクション返信のコンポーネントをすべて無効化する
 *
 * メッセージが既に削除されている場合は静かに失敗する。
 * @param interaction 対象インタラクション
 * @param rows 無効化対象の ActionRow 配列
 * @param timeoutMs 無効化までの待機時間（ミリ秒）
 */
export function disableComponentsAfterTimeout(
  interaction: ChatInputCommandInteraction,
  rows: ActionRowBuilder<MessageActionRowComponentBuilder>[],
  timeoutMs: number,
): void {
  setTimeout(() => {
    // 各行のコンポーネントを複製して disabled にする
    const disabledRows = rows.map((row) => {
      const cloned = ActionRowBuilder.from<MessageActionRowComponentBuilder>(
        row.toJSON(),
      );
      cloned.components.forEach((c) => c.setDisabled(true));
      return cloned;
    });
    // メッセージが既に削除済みの場合は無視
    interaction.editReply({ components: disabledRows }).catch(() => {});
  }, timeoutMs);
}
