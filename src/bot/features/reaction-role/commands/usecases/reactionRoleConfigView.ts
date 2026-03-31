// src/bot/features/reaction-role/commands/usecases/reactionRoleConfigView.ts
// リアクションロール view サブコマンド処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type MessageActionRowComponentBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type TextChannel,
} from "discord.js";
import {
  type GuildReactionRolePanel,
  REACTION_ROLE_MODE,
} from "../../../../../shared/database/types/reactionRoleTypes";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import { buildPaginationRow } from "../../../../shared/pagination";
import {
  createErrorEmbed,
  createInfoEmbed,
} from "../../../../utils/messageResponse";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
  REACTION_ROLE_FIELD_VALUE_MAX_LENGTH,
  REACTION_ROLE_SESSION_TTL_MS,
  REACTION_ROLE_TRUNCATION_RESERVE,
} from "../reactionRoleCommand.constants";

/**
 * reaction-role-config view サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleReactionRoleConfigView(
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

  const embed = buildViewEmbed(panels, 0, interaction.locale);
  const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  if (panels.length > 1) {
    components.push(
      buildPaginationRow(
        REACTION_ROLE_CUSTOM_ID.VIEW_PREFIX,
        0,
        panels.length,
        interaction.locale,
      ),
    );

    const sessionId = crypto.randomUUID();
    const guild = interaction.guild;
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`${REACTION_ROLE_CUSTOM_ID.VIEW_SELECT_PREFIX}${sessionId}`)
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "reactionRole:ui.select.panel_placeholder",
        ),
      )
      .addOptions(
        panels.map((panel, index) => {
          const channelName =
            guild?.channels.cache.get(panel.channelId)?.name ?? panel.channelId;
          return {
            label: panel.title,
            description: `#${channelName}`,
            value: String(index),
          };
        }),
      );

    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
    );
  }

  await interaction.reply({
    embeds: [embed],
    components,
    flags: MessageFlags.Ephemeral,
  });

  if (components.length > 0) {
    disableComponentsAfterTimeout(
      interaction,
      components,
      REACTION_ROLE_SESSION_TTL_MS,
    );
  }

  // クリーンアップが発生した場合は通知
  if (cleanedUp > 0) {
    const cleanupEmbed = createInfoEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.panels_cleaned_up",
        { count: cleanedUp },
      ),
      { locale: interaction.locale },
    );
    await interaction.followUp({
      embeds: [cleanupEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * view用のEmbed を構築する
 * @param panels パネル情報の配列
 * @param page 表示するページ番号（0始まり）
 * @param locale ユーザーのロケール
 * @returns 構築されたEmbedBuilder
 */
export function buildViewEmbed(
  panels: {
    title: string;
    channelId: string;
    mode: string;
    color: string;
    buttons: string;
  }[],
  page: number,
  locale: string,
): EmbedBuilder {
  const panel = panels[page];
  const buttons = parseButtons(panel.buttons);

  const modeDisplayKey =
    panel.mode === REACTION_ROLE_MODE.ONE_ACTION
      ? "reactionRole:embed.field.value.mode_one_action"
      : panel.mode === REACTION_ROLE_MODE.EXCLUSIVE
        ? "reactionRole:embed.field.value.mode_exclusive"
        : "reactionRole:embed.field.value.mode_toggle";

  // ボタン一覧の構築
  let buttonListValue = buttons
    .map((btn) => {
      const emoji = btn.emoji ? `${btn.emoji} ` : "";
      const roles = btn.roleIds.map((id) => `<@&${id}>`).join(", ");
      return `${emoji}${btn.label} → ${roles}`;
    })
    .join("\n");

  if (buttonListValue.length > REACTION_ROLE_FIELD_VALUE_MAX_LENGTH) {
    // 先頭N件 + 「他 X件」で省略
    let truncated = "";
    let shown = 0;
    for (const btn of buttons) {
      const emoji = btn.emoji ? `${btn.emoji} ` : "";
      const roles = btn.roleIds.map((id) => `<@&${id}>`).join(", ");
      const line = `${emoji}${btn.label} → ${roles}\n`;
      if (
        truncated.length + line.length >
        REACTION_ROLE_FIELD_VALUE_MAX_LENGTH - REACTION_ROLE_TRUNCATION_RESERVE
      ) {
        break;
      }
      truncated += line;
      shown++;
    }
    const remaining = buttons.length - shown;
    truncated += tInteraction(locale, "reactionRole:user-response.and_more", {
      count: remaining,
    });
    buttonListValue = truncated;
  }

  return createInfoEmbed("", {
    title: tInteraction(locale, "reactionRole:embed.title.config_view"),
    locale,
    fields: [
      {
        name: tInteraction(locale, "reactionRole:embed.field.name.panel_title"),
        value: panel.title,
        inline: true,
      },
      {
        name: tInteraction(locale, "reactionRole:embed.field.name.channel"),
        value: `<#${panel.channelId}>`,
        inline: true,
      },
      {
        name: tInteraction(locale, "reactionRole:embed.field.name.mode"),
        value: tInteraction(locale, modeDisplayKey),
        inline: true,
      },
      {
        name: tInteraction(locale, "reactionRole:embed.field.name.color"),
        value: panel.color,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "reactionRole:embed.field.name.button_count",
        ),
        value: `${buttons.length}`,
        inline: true,
      },
      {
        name: tInteraction(locale, "reactionRole:embed.field.name.button_list"),
        value: buttonListValue || "-",
      },
    ],
  });
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
