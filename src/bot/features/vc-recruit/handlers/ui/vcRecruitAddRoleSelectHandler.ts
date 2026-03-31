// src/bot/features/vc-recruit/handlers/ui/vcRecruitAddRoleSelectHandler.ts
// add-role コマンドの RoleSelectMenu 選択応答を処理する

import type { RoleSelectMenuInteraction } from "discord.js";
import type { RoleSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { VC_RECRUIT_ROLE_CUSTOM_ID } from "../../commands/vcRecruitConfigCommand.constants";
import { vcRecruitAddRoleSelections } from "./vcRecruitRoleState";

/**
 * add-role の RoleSelectMenu 選択イベントを処理するハンドラー
 *
 * ユーザーがロールを選択するたびに、セッションストアへ最新の選択状態を保存する。
 */
export const vcRecruitAddRoleSelectHandler: RoleSelectHandler = {
  /**
   * このハンドラーが処理すべき customId かどうかを判定する
   * @param customId セレクトメニューの customId
   * @returns add-role セレクトメニューであれば true
   */
  matches(customId) {
    return customId.startsWith(
      VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX,
    );
  },

  /**
   * ロール選択イベントを処理し、選択状態をセッションストアに保存する
   * @param interaction ロールセレクトメニューインタラクション
   */
  async execute(interaction: RoleSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX.length,
    );
    vcRecruitAddRoleSelections.set(sessionId, [...interaction.values]);
    await interaction.deferUpdate();
  },
};
