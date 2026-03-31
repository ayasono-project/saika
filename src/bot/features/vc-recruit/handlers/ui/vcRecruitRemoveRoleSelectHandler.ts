// src/bot/features/vc-recruit/handlers/ui/vcRecruitRemoveRoleSelectHandler.ts
// remove-role コマンドの StringSelectMenu 選択応答を処理する

import type { StringSelectMenuInteraction } from "discord.js";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { VC_RECRUIT_ROLE_CUSTOM_ID } from "../../commands/vcRecruitConfigCommand.constants";
import { vcRecruitRemoveRoleSelections } from "./vcRecruitRoleState";

/**
 * remove-role の StringSelectMenu 選択イベントを処理するハンドラー
 *
 * ユーザーがロールを選択するたびに、セッションストアへ最新の選択状態を保存する。
 */
export const vcRecruitRemoveRoleSelectHandler: StringSelectHandler = {
  /**
   * このハンドラーが処理すべき customId かどうかを判定する
   * @param customId セレクトメニューの customId
   * @returns remove-role セレクトメニューであれば true
   */
  matches(customId) {
    return customId.startsWith(
      VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX,
    );
  },

  /**
   * ロール選択イベントを処理し、選択状態をセッションストアに保存する
   * @param interaction 文字列セレクトメニューインタラクション
   */
  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX.length,
    );
    vcRecruitRemoveRoleSelections.set(sessionId, [...interaction.values]);
    await interaction.deferUpdate();
  },
};
