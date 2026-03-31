// src/bot/features/reaction-role/handlers/ui/reactionRoleTeardownHandler.ts
// teardown フローのセレクトメニュー・確認ボタンハンドラ

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  type StringSelectMenuInteraction,
  type TextChannel,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type {
  ButtonHandler,
  StringSelectHandler,
} from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { REACTION_ROLE_CUSTOM_ID } from "../../commands/reactionRoleCommand.constants";
import { reactionRoleTeardownSessions } from "./reactionRoleSetupState";

/**
 * teardown フローのパネル選択セレクトメニューハンドラ
 */
export const reactionRoleTeardownSelectHandler: StringSelectHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.TEARDOWN_SELECT_PREFIX);
  },

  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.TEARDOWN_SELECT_PREFIX.length,
    );
    const session = reactionRoleTeardownSessions.get(sessionId);
    if (!session) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    session.panelIds = interaction.values;

    // パネル情報を取得して確認表示
    const configService = getBotReactionRolePanelConfigService();
    const panelInfos: string[] = [];
    for (const panelId of session.panelIds) {
      const panel = await configService.findById(panelId);
      if (panel) {
        panelInfos.push(`「${panel.title}」（<#${panel.channelId}>）`);
      }
    }

    const count = session.panelIds.length;
    const embed = createWarningEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:embed.description.teardown_confirm",
        { count },
      ),
      {
        title: tInteraction(
          interaction.locale,
          "reactionRole:embed.title.teardown_confirm",
        ),
        locale: interaction.locale,
        fields: [
          {
            name: tInteraction(
              interaction.locale,
              "reactionRole:embed.field.name.teardown_targets",
              { count },
            ),
            value: panelInfos.join("、"),
          },
        ],
      },
    );

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX}${sessionId}`,
        )
        .setEmoji("🗑️")
        .setLabel(
          tInteraction(
            interaction.locale,
            "reactionRole:ui.button.teardown_confirm",
          ),
        )
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(
          `${REACTION_ROLE_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX}${sessionId}`,
        )
        .setEmoji("❌")
        .setLabel(
          tInteraction(
            interaction.locale,
            "reactionRole:ui.button.teardown_cancel",
          ),
        )
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({
      embeds: [embed],
      components: [confirmRow],
    });
  },
};

/**
 * teardown フローの確認・キャンセルボタンハンドラ
 */
export const reactionRoleTeardownButtonHandler: ButtonHandler = {
  matches(customId: string) {
    return (
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX) ||
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX)
    );
  },

  async execute(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(
        REACTION_ROLE_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX,
      )
    ) {
      const sessionId = interaction.customId.slice(
        REACTION_ROLE_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX.length,
      );
      reactionRoleTeardownSessions.delete(sessionId);

      const embed = createInfoEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.teardown_cancelled",
        ),
        { locale: interaction.locale },
      );
      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    // 確認
    const sessionId = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX.length,
    );
    const session = reactionRoleTeardownSessions.get(sessionId);
    if (!session) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.session_expired",
        ),
        { locale: interaction.locale },
      );
      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();

    const configService = getBotReactionRolePanelConfigService();
    const guildId = interaction.guildId;
    if (!guildId) return;

    // パネルメッセージを削除し、DBレコードを削除
    for (const panelId of session.panelIds) {
      const panel = await configService.findById(panelId);
      if (panel) {
        // パネルメッセージを削除（チャンネルはfetchで取得）
        try {
          const channel = (await interaction.client.channels
            .fetch(panel.channelId)
            .catch(() => null)) as TextChannel | null;
          if (channel) {
            const message = await channel.messages
              .fetch(panel.messageId)
              .catch(() => null);
            if (message) {
              await message.delete().catch(() => null);
            }
          }
        } catch {
          // メッセージが既に削除済みの場合は無視
        }

        await configService.delete(panelId);
      }
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.teardown",
        {
          guildId,
          panelIds: session.panelIds.join(","),
        },
      ),
    );

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.teardown_success",
        { count: session.panelIds.length },
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({
      embeds: [embed],
      components: [],
    });

    reactionRoleTeardownSessions.delete(sessionId);
  },
};
