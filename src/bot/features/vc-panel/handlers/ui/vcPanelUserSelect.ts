// src/bot/features/vc-panel/handlers/ui/vcPanelUserSelect.ts
// VC操作パネルの AFK 移動セレクトメニュー処理（VAC・VC募集など共用）

import {
  ChannelType,
  type GuildMember,
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";
import { getAfkConfig } from "../../../../../shared/features/afk/afkConfigService";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import {
  getVacPanelChannelId,
  VAC_PANEL_CUSTOM_ID,
} from "../../vcControlPanel";
import { isVcPanelManagedChannel } from "../../vcPanelOwnershipRegistry";

export const vcPanelUserSelectHandler: StringSelectHandler = {
  /**
   * ハンドラー対象の customId かを判定する
   * @param customId 判定対象の customId
   * @returns VC操作パネルAFKセレクトなら true
   */
  matches(customId) {
    return customId.startsWith(VAC_PANEL_CUSTOM_ID.AFK_SELECT_PREFIX);
  },

  /**
   * VC操作パネルの AFK ユーザー選択を処理する
   * @param interaction ユーザーセレクトインタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: StringSelectMenuInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    const channelId = getVacPanelChannelId(
      interaction.customId,
      VAC_PANEL_CUSTOM_ID.AFK_SELECT_PREFIX,
    );
    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vac:user-response.not_vac_channel",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_channel_invalid",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 登録済みチェッカーで管理対象かを判定
    if (!(await isVcPanelManagedChannel(guild.id, channel.id))) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vac:user-response.not_vac_channel",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_channel_invalid",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const operator = (await guild.members
      .fetch(interaction.user.id)
      .catch(() => null)) as GuildMember | null;

    if (!operator || operator.voice.channelId !== channel.id) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(interaction.locale, "vac:user-response.not_in_vc"),
            {
              title: tInteraction(interaction.locale, "common:title_not_in_vc"),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const afkConfig = await getAfkConfig(guild.id);
    if (!afkConfig || !afkConfig.enabled || !afkConfig.channelId) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "afk:user-response.not_configured",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_config_required",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const afkChannel = await guild.channels
      .fetch(afkConfig.channelId)
      .catch(() => null);

    if (!afkChannel || afkChannel.type !== ChannelType.GuildVoice) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "afk:user-response.channel_not_found",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_channel_not_found",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let movedCount = 0;

    for (const userId of interaction.values) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member || member.voice.channelId !== channel.id) {
        continue;
      }
      const success = await member.voice
        .setChannel(afkChannel)
        .then(() => true)
        .catch(() => false);
      if (success) {
        movedCount += 1;
      }
    }

    if (movedCount === 0) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vac:user-response.afk_move_failed",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_move_failed",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await safeReply(interaction, {
      embeds: [
        createSuccessEmbed(
          tInteraction(interaction.locale, "vac:user-response.members_moved", {
            channel: afkChannel.toString(),
          }),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
