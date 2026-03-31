// src/bot/features/guild-config/handlers/ui/guildConfigViewButtonHandler.ts
// guild-config view ページネーションボタンハンドラ

import { type ButtonInteraction, ComponentType } from "discord.js";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "../../../../shared/pagination";
import { buildViewPayload } from "../../commands/guildConfigCommand.view";
import {
  GUILD_CONFIG_CUSTOM_ID,
  GUILD_CONFIG_PREFIX,
  VIEW_PAGES,
} from "../../constants/guildConfig.constants";

/**
 * guild-config view のページネーションボタンを処理するハンドラ
 */
export const guildConfigViewButtonHandler: ButtonHandler = {
  /**
   * guild-config のページネーションボタンかを判定する
   * @param customId ボタンの customId
   * @returns 対象の場合 true
   */
  matches: (customId: string) => {
    return (
      customId === GUILD_CONFIG_CUSTOM_ID.PAGE_FIRST ||
      customId === GUILD_CONFIG_CUSTOM_ID.PAGE_PREV ||
      customId === GUILD_CONFIG_CUSTOM_ID.PAGE_JUMP ||
      customId === GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT ||
      customId === GUILD_CONFIG_CUSTOM_ID.PAGE_LAST
    );
  },

  /**
   * ページネーションボタンの処理を実行する
   * @param interaction ボタンインタラクション
   */
  execute: async (interaction: ButtonInteraction) => {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const totalPages = VIEW_PAGES.length;
    const action = parsePaginationAction(
      interaction.customId,
      GUILD_CONFIG_PREFIX,
    );
    if (!action) return;

    // 現在ページをセレクトメニューのデフォルト値から復元
    const currentPage = getCurrentPageFromMessage(interaction);

    let newPage: number;

    if (action === "jump") {
      // モーダル表示 → ページ番号入力
      const input = await showPaginationJumpModal(
        interaction,
        GUILD_CONFIG_PREFIX,
        totalPages,
        interaction.locale,
      );
      if (!input) return;

      const pageNum = parseInt(input, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) return;
      newPage = pageNum - 1;
    } else {
      newPage = resolvePageFromAction(action, currentPage, totalPages);
      // ページが変わらない場合は何もしない
      if (newPage === currentPage) {
        await interaction.deferUpdate();
        return;
      }
    }

    // ページを再生成して更新
    const { embed, components } = await buildViewPayload(
      newPage,
      guildId,
      interaction.locale,
    );

    // jump の場合は deferUpdate 済み
    if (action === "jump") {
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.update({ embeds: [embed], components });
    }
  },
};

/**
 * メッセージのセレクトメニューから現在ページを復元する
 * @param interaction ボタンインタラクション
 * @returns 現在のページ番号（0-indexed）
 */
function getCurrentPageFromMessage(interaction: ButtonInteraction): number {
  // セレクトメニューの default 選択肢からページを特定
  for (const row of interaction.message.components) {
    if (row.type !== ComponentType.ActionRow) continue;
    for (const component of row.components) {
      if (
        component.type === ComponentType.StringSelect &&
        component.customId === GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT &&
        "options" in component
      ) {
        const options = component.options as Array<{
          value: string;
          default: boolean;
        }>;
        const defaultOption = options.find((o) => o.default);
        if (defaultOption) {
          const index = VIEW_PAGES.findIndex(
            (p) => p.value === defaultOption.value,
          );
          if (index >= 0) return index;
        }
      }
    }
  }

  return 0;
}
