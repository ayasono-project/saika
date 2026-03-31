// src/bot/features/vc-recruit/handlers/ui/vcRecruitRenameModal.ts
// VC募集メッセージからのVC名変更モーダル送信処理

import {
  ChannelType,
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { VC_RECRUIT_POST_CUSTOM_ID } from "../../commands/vcRecruitConfigCommand.constants";

export const vcRecruitRenameModalHandler: ModalHandler = {
  /**
   * VC名変更モーダル送信に一致するか判定する
   * @param customId インタラクションのカスタムID
   * @returns 一致する場合 true
   */
  matches(customId) {
    return customId.startsWith(
      VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_MODAL_PREFIX,
    );
  },

  /**
   * VC名変更モーダルの送信を処理する
   * @param interaction モーダル送信インタラクション
   */
  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const voiceChannelId = interaction.customId.slice(
      VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_MODAL_PREFIX.length,
    );

    const newName = interaction.fields.getTextInputValue(
      "vc-recruit:rename-vc-name-modal-input",
    );

    // VCの存在確認
    const vc = await guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!vc || vc.type !== ChannelType.GuildVoice) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vcRecruit:user-response.vc_already_deleted",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_resource_not_found",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // チャンネル名を更新
    await vc.setName(newName.trim());

    // 成功通知
    const successText = tInteraction(
      interaction.locale,
      "vcRecruit:user-response.rename_success",
    );
    await safeReply(interaction, {
      embeds: [createSuccessEmbed(successText)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
