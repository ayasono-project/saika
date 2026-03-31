// src/bot/features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler.ts
// sticky-message remove コマンドが送信した StringSelectMenu の選択応答を処理する

import { type StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { STICKY_MESSAGE_COMMAND } from "../../commands/stickyMessageCommand.constants";
import { stickyMessageRemoveSelections } from "./stickyMessageRemoveState";

export const stickyMessageRemoveSelectHandler: StringSelectHandler = {
  matches(customId) {
    return customId === STICKY_MESSAGE_COMMAND.REMOVE_SELECT_CUSTOM_ID;
  },

  async execute(interaction: StringSelectMenuInteraction) {
    // 選択されたチャンネル ID を一時保存する
    const key = `${interaction.guildId}:${interaction.user.id}`;
    stickyMessageRemoveSelections.set(key, interaction.values);

    // セレクトメニューを残したままインタラクションを応答する（UI 変更なし）
    await interaction.deferUpdate();
  },
};
