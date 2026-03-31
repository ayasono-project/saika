// src/bot/features/guild-config/handlers/ui/guildConfigViewSelectHandler.ts
// guild-config view ページセレクトメニューハンドラ

import type { StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { buildViewPayload } from "../../commands/guildConfigCommand.view";
import {
  GUILD_CONFIG_CUSTOM_ID,
  VIEW_PAGES,
} from "../../constants/guildConfig.constants";

/**
 * guild-config view のページセレクトメニューを処理するハンドラ
 */
export const guildConfigViewSelectHandler: StringSelectHandler = {
  /**
   * guild-config のページセレクトメニューかを判定する
   * @param customId セレクトメニューの customId
   * @returns 対象の場合 true
   */
  matches: (customId: string) => {
    return customId === GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT;
  },

  /**
   * セレクトメニューの選択を処理する
   * @param interaction セレクトメニューインタラクション
   */
  execute: async (interaction: StringSelectMenuInteraction) => {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const selectedValue = interaction.values[0];
    const pageIndex = VIEW_PAGES.findIndex((p) => p.value === selectedValue);
    if (pageIndex < 0) return;

    // 選択されたページの Embed + Components を再生成
    const { embed, components } = await buildViewPayload(
      pageIndex,
      guildId,
      interaction.locale,
    );

    await interaction.update({ embeds: [embed], components });
  },
};
