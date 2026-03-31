// src/bot/features/vc-panel/handlers/ui/vcPanelButton.ts
// VC操作パネルのボタン処理（VAC・VC募集など共用）

import {
  ActionRowBuilder,
  type ButtonInteraction,
  ChannelType,
  type GuildMember,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import {
  getVacPanelChannelId,
  sendVcControlPanel,
  VAC_PANEL_CUSTOM_ID,
} from "../../vcControlPanel";
import { isVcPanelManagedChannel } from "../../vcPanelOwnershipRegistry";

export const vcPanelButtonHandler: ButtonHandler = {
  /**
   * ハンドラー対象の customId かを判定する
   * @param customId 判定対象の customId
   * @returns VC操作パネルボタンなら true
   */
  matches(customId) {
    return (
      customId.startsWith(VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX) ||
      customId.startsWith(VAC_PANEL_CUSTOM_ID.LIMIT_BUTTON_PREFIX) ||
      customId.startsWith(VAC_PANEL_CUSTOM_ID.AFK_BUTTON_PREFIX) ||
      customId.startsWith(VAC_PANEL_CUSTOM_ID.REFRESH_BUTTON_PREFIX)
    );
  },

  /**
   * VC操作パネルのボタン操作を実行する
   * @param interaction ボタンインタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    const channelId = getPanelChannelId(interaction.customId);
    if (!channelId) {
      return;
    }

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

    // 登録済みチェッカー（VAC・VC募集など）で管理対象かを判定
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

    const member = (await guild.members
      .fetch(interaction.user.id)
      .catch(() => null)) as GuildMember | null;

    if (!member || member.voice.channelId !== channel.id) {
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

    if (
      interaction.customId.startsWith(VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX)
    ) {
      const title = tInteraction(interaction.locale, "vac:ui.button.rename");
      const modal = new ModalBuilder()
        .setCustomId(`${VAC_PANEL_CUSTOM_ID.RENAME_MODAL_PREFIX}${channel.id}`)
        .setTitle(title)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(VAC_PANEL_CUSTOM_ID.RENAME_INPUT)
              .setLabel(title)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100),
          ),
        );

      await interaction.showModal(modal);
      return;
    }

    if (
      interaction.customId.startsWith(VAC_PANEL_CUSTOM_ID.LIMIT_BUTTON_PREFIX)
    ) {
      const title = tInteraction(interaction.locale, "vac:ui.button.limit");
      const modal = new ModalBuilder()
        .setCustomId(`${VAC_PANEL_CUSTOM_ID.LIMIT_MODAL_PREFIX}${channel.id}`)
        .setTitle(title)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(VAC_PANEL_CUSTOM_ID.LIMIT_INPUT)
              .setLabel(title)
              .setPlaceholder(
                tInteraction(
                  interaction.locale,
                  "vac:ui.modal.limit_placeholder",
                ),
              )
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(2),
          ),
        );

      await interaction.showModal(modal);
      return;
    }

    if (
      interaction.customId.startsWith(VAC_PANEL_CUSTOM_ID.AFK_BUTTON_PREFIX)
    ) {
      const vcMembers = [...channel.members.values()];

      if (vcMembers.length === 0) {
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(interaction.locale, "vac:user-response.not_in_vc"),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_not_in_vc",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const options = vcMembers
        .slice(0, 25)
        .map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m.displayName.slice(0, 100))
            .setValue(m.id),
        );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`${VAC_PANEL_CUSTOM_ID.AFK_SELECT_PREFIX}${channel.id}`)
        .setPlaceholder(tInteraction(interaction.locale, "vac:ui.button.afk"))
        .setMinValues(1)
        .setMaxValues(Math.min(25, vcMembers.length))
        .addOptions(options);

      await safeReply(interaction, {
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      interaction.customId.startsWith(VAC_PANEL_CUSTOM_ID.REFRESH_BUTTON_PREFIX)
    ) {
      if (interaction.message.deletable) {
        await interaction.message.delete().catch(() => null);
      }
      await sendVcControlPanel(channel);

      await safeReply(interaction, {
        embeds: [
          createSuccessEmbed(
            tInteraction(
              interaction.locale,
              "vac:user-response.panel_refreshed",
            ),
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

/**
 * ボタン customId から VC操作パネル対象チャンネル ID を解決する関数
 * @param customId 解析対象の customId
 * @returns 解決したチャンネルID（未対応時は空文字）
 */
function getPanelChannelId(customId: string): string {
  // 全パネルボタンプレフィックスを走査し、一致するプレフィックスからチャンネルIDを抽出する
  const prefixes = [
    VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX,
    VAC_PANEL_CUSTOM_ID.LIMIT_BUTTON_PREFIX,
    VAC_PANEL_CUSTOM_ID.AFK_BUTTON_PREFIX,
    VAC_PANEL_CUSTOM_ID.REFRESH_BUTTON_PREFIX,
  ] as const;
  for (const prefix of prefixes) {
    if (customId.startsWith(prefix)) {
      return getVacPanelChannelId(customId, prefix);
    }
  }
  return "";
}
