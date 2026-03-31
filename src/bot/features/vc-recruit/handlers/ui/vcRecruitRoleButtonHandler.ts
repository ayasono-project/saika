// src/bot/features/vc-recruit/handlers/ui/vcRecruitRoleButtonHandler.ts
// add-role / remove-role の確認・キャンセルボタン処理

import { type ButtonInteraction } from "discord.js";
import { VC_RECRUIT_MENTION_ROLE_ADD_RESULT } from "../../../../../shared/database/types";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotVcRecruitConfigService } from "../../../../services/botCompositionRoot";
import {
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import {
  DISCORD_SELECT_MAX_OPTIONS,
  VC_RECRUIT_ROLE_CUSTOM_ID,
} from "../../commands/vcRecruitConfigCommand.constants";
import {
  vcRecruitAddRoleSelections,
  vcRecruitRemoveRoleSelections,
} from "./vcRecruitRoleState";

/**
 * add-role / remove-role の確認・キャンセルボタンを処理するハンドラー
 *
 * - 確認ボタン: 選択されたロールの追加 / 削除を実行し、結果を表示する
 * - キャンセルボタン: セッションを破棄し、キャンセルメッセージを表示する
 */
export const vcRecruitRoleButtonHandler: ButtonHandler = {
  /**
   * このハンドラーが処理すべき customId かどうかを判定する
   * @param customId ボタンの customId
   * @returns add-role / remove-role の確認・キャンセルボタンであれば true
   */
  matches(customId) {
    return (
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX) ||
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX) ||
      customId.startsWith(
        VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX,
      ) ||
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX)
    );
  },

  /**
   * ボタンインタラクションを処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const { customId } = interaction;

    // ── キャンセル（add-role / remove-role 共通） ──
    if (
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX) ||
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX)
    ) {
      const isAdd = customId.startsWith(
        VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX,
      );
      const sessionId = customId.slice(
        isAdd
          ? VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX.length
          : VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX.length,
      );

      if (isAdd) {
        vcRecruitAddRoleSelections.delete(sessionId);
      } else {
        vcRecruitRemoveRoleSelections.delete(sessionId);
      }

      await interaction.update({
        embeds: [
          createInfoEmbed(tInteraction(interaction.locale, "common:cancelled")),
        ],
        components: [],
      });
      return;
    }

    // ── add-role 確認 ──
    if (
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX)
    ) {
      const sessionId = customId.slice(
        VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX.length,
      );
      const selectedRoleIds = vcRecruitAddRoleSelections.get(sessionId);

      if (!selectedRoleIds || selectedRoleIds.length === 0) {
        await interaction.reply({
          embeds: [
            createInfoEmbed(
              tInteraction(
                interaction.locale,
                "vcRecruit:user-response.add_role_no_selection",
              ),
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      vcRecruitAddRoleSelections.delete(sessionId);

      const repo = getBotVcRecruitConfigService();
      const succeededRoles: string[] = [];
      const failedRoles: string[] = [];

      for (const roleId of selectedRoleIds) {
        const result = await repo.addMentionRoleId(guildId, roleId);
        if (
          result === VC_RECRUIT_MENTION_ROLE_ADD_RESULT.ADDED ||
          result === VC_RECRUIT_MENTION_ROLE_ADD_RESULT.ALREADY_EXISTS
        ) {
          succeededRoles.push(roleId);
        } else {
          // LIMIT_EXCEEDED
          failedRoles.push(roleId);
        }
      }

      const embeds = [];

      // 成功ロールの Embed（description は空、field にロール一覧を表示）
      if (succeededRoles.length > 0) {
        const roleMentions = succeededRoles.map((id) => `<@&${id}>`).join(", ");
        embeds.push(
          createSuccessEmbed("", {
            title: tInteraction(
              interaction.locale,
              "vcRecruit:embed.title.add_role_success",
            ),
            fields: [
              {
                name: tInteraction(
                  interaction.locale,
                  "vcRecruit:embed.field.name.add_role_success",
                ),
                value: roleMentions,
              },
            ],
          }),
        );
      }

      // 上限超過で登録できなかったロールの Embed
      if (failedRoles.length > 0) {
        const failedMentions = failedRoles.map((id) => `<@&${id}>`).join(", ");
        embeds.push(
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vcRecruit:embed.description.add_role_limit",
              { limit: DISCORD_SELECT_MAX_OPTIONS },
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_role_limit_exceeded",
              ),
              fields: [
                {
                  name: tInteraction(
                    interaction.locale,
                    "vcRecruit:embed.field.name.add_role_limit",
                  ),
                  value: failedMentions,
                },
              ],
            },
          ),
        );
      }

      await interaction.update({
        embeds,
        components: [],
      });
      return;
    }

    // ── remove-role 確認 ──
    if (
      customId.startsWith(VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX)
    ) {
      const sessionId = customId.slice(
        VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX.length,
      );
      const selectedRoleIds = vcRecruitRemoveRoleSelections.get(sessionId);

      if (!selectedRoleIds || selectedRoleIds.length === 0) {
        await interaction.reply({
          embeds: [
            createInfoEmbed(
              tInteraction(
                interaction.locale,
                "vcRecruit:user-response.remove_role_no_selection",
              ),
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      vcRecruitRemoveRoleSelections.delete(sessionId);

      const repo = getBotVcRecruitConfigService();

      // 全ロールを削除実行（REMOVED / NOT_FOUND のどちらもユーザーの意図通り）
      for (const roleId of selectedRoleIds) {
        await repo.removeMentionRoleId(guildId, roleId);
      }

      // 成功 Embed（description は空、field にロール一覧を表示）
      const roleMentions = selectedRoleIds.map((id) => `<@&${id}>`).join(", ");
      await interaction.update({
        embeds: [
          createSuccessEmbed("", {
            title: tInteraction(
              interaction.locale,
              "vcRecruit:embed.title.remove_role_success",
            ),
            fields: [
              {
                name: tInteraction(
                  interaction.locale,
                  "vcRecruit:embed.field.name.remove_role_success",
                ),
                value: roleMentions,
              },
            ],
          }),
        ],
        components: [],
      });
    }
  },
};
