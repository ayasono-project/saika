// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown.ts
// リアクションロール teardown サブコマンド処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  type TextChannel,
} from "discord.js";
import type { GuildReactionRolePanel } from "../../../../../shared/database/types/reactionRoleTypes";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import {
  createErrorEmbed,
  createInfoEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { reactionRoleTeardownSessions } from "../../handlers/ui/reactionRoleSetupState";
import {
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_SESSION_TTL_MS,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config teardown サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigTeardown(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const configService = getBotReactionRolePanelConfigService();
  const allPanels = await configService.findAllByGuild(guildId);

  // メッセージ存在確認 → 不在パネルを DB 削除して除外
  const { existing: panels, cleanedUp } = await filterExistingPanels(
    interaction,
    allPanels,
    configService,
  );

  if (panels.length === 0) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "reactionRole:user-response.no_panels"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sessionId = crypto.randomUUID();

  // パネルが1件のみの場合はセレクトメニューをスキップして直接確認表示
  if (panels.length === 1) {
    const panel = panels[0];
    reactionRoleTeardownSessions.set(sessionId, {
      panelIds: [panel.id],
    });

    const embed = createWarningEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:embed.description.teardown_confirm",
        { count: 1 },
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
              { count: 1 },
            ),
            value: `「${panel.title}」（<#${panel.channelId}>）`,
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

    await interaction.reply({
      embeds: [embed],
      components: [confirmRow],
      flags: MessageFlags.Ephemeral,
    });

    await notifyCleanedUp(interaction, cleanedUp);
    return;
  }

  // 複数パネルの場合はセレクトメニュー表示
  reactionRoleTeardownSessions.set(sessionId, {
    panelIds: [],
  });

  const guild = interaction.guild;
  const options = panels.map((panel) => {
    const channelName =
      guild?.channels.cache.get(panel.channelId)?.name ?? panel.channelId;
    return {
      label: `${panel.title}（#${channelName}）`,
      value: panel.id,
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${REACTION_ROLE_CUSTOM_ID.TEARDOWN_SELECT_PREFIX}${sessionId}`,
    )
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "reactionRole:ui.select.teardown_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(panels.length)
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );

  await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  disableComponentsAfterTimeout(
    interaction,
    [row],
    REACTION_ROLE_SESSION_TTL_MS,
  );

  await notifyCleanedUp(interaction, cleanedUp);
}

/**
 * パネル一覧からメッセージが存在するもののみを返す
 * 不在パネルは DB レコードを削除する
 */
async function filterExistingPanels(
  interaction: ChatInputCommandInteraction,
  panels: GuildReactionRolePanel[],
  configService: { delete: (id: string) => Promise<void> },
): Promise<{ existing: GuildReactionRolePanel[]; cleanedUp: number }> {
  const existing: GuildReactionRolePanel[] = [];
  let cleanedUp = 0;

  for (const panel of panels) {
    const channel = (await interaction.client.channels
      .fetch(panel.channelId)
      .catch(() => null)) as TextChannel | null;
    if (!channel) {
      await configService.delete(panel.id);
      cleanedUp++;
      continue;
    }

    const message = await channel.messages
      .fetch(panel.messageId)
      .catch(() => null);
    if (!message) {
      await configService.delete(panel.id);
      cleanedUp++;
      continue;
    }

    existing.push(panel);
  }

  return { existing, cleanedUp };
}

/**
 * クリーンアップが発生した場合に通知する
 */
async function notifyCleanedUp(
  interaction: ChatInputCommandInteraction,
  cleanedUp: number,
): Promise<void> {
  if (cleanedUp === 0) return;

  const embed = createInfoEmbed(
    tInteraction(
      interaction.locale,
      "reactionRole:user-response.panels_cleaned_up",
      { count: cleanedUp },
    ),
    { locale: interaction.locale },
  );
  await interaction.followUp({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
