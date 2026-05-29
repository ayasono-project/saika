// src/bot/features/ticket/commands/usecases/ticketSettingsTeardown.ts
// チケット設定削除（teardown）処理

import crypto from "node:crypto";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  type TextChannel,
} from "discord.js";
import { getBotTicketSettingsService } from "../../../../bot/services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../bot/shared/disableComponentsAfterTimeout";
import {
  createErrorEmbed,
  createInfoEmbed,
} from "../../../../bot/utils/messageResponse";
import type { GuildTicketSettings } from "../../../../shared/database/types";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { showTeardownConfirmation } from "../../handlers/ui/ticketTeardownSelectHandler";
import { ticketTeardownSessions } from "../../handlers/ui/ticketTeardownState";
import {
  TICKET_CUSTOM_ID,
  TICKET_SESSION_TTL_MS,
} from "../ticketCommand.constants";

/**
 * ticket-settings teardown サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketSettingsTeardown(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const settingsService = getBotTicketSettingsService();
  const allSettings = await settingsService.findAllByGuild(guildId);

  // メッセージ存在確認 → 不在パネルを DB 削除して除外
  const { existing: configs, cleanedUp } = await filterExistingSettings(
    interaction,
    allSettings,
    settingsService,
  );

  if (configs.length === 0) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.no_configs"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sessionId = crypto.randomUUID();

  // 1件の場合はセレクトメニューをスキップし、直接確認ダイアログを表示
  if (configs.length === 1) {
    ticketTeardownSessions.set(sessionId, {
      categoryIds: [configs[0].categoryId],
    });
    await showTeardownConfirmation(
      interaction,
      sessionId,
      [configs[0].categoryId],
      guildId,
    );
    await notifyCleanedUp(interaction, cleanedUp);
    return;
  }

  // 複数件の場合はセレクトメニュー（複数選択可）を表示
  ticketTeardownSessions.set(sessionId, { categoryIds: [] });

  const options = await Promise.all(
    configs.map(async (config: GuildTicketSettings) => {
      let label: string;
      try {
        const channel = await interaction.guild?.channels.fetch(
          config.categoryId,
        );
        label = channel?.name ?? config.categoryId;
      } catch {
        label = config.categoryId;
      }
      return {
        label,
        value: config.categoryId,
      };
    }),
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${TICKET_CUSTOM_ID.TEARDOWN_SELECT_PREFIX}${sessionId}`)
    .setPlaceholder(
      tInteraction(interaction.locale, "ticket:ui.select.teardown_placeholder"),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    components: [selectRow],
    flags: MessageFlags.Ephemeral,
  });

  disableComponentsAfterTimeout(
    interaction,
    [selectRow],
    TICKET_SESSION_TTL_MS,
  );

  await notifyCleanedUp(interaction, cleanedUp);
}

/**
 * 設定一覧からパネルメッセージが存在するもののみを返す
 * 不在パネルは DB レコードを削除する
 */
async function filterExistingSettings(
  interaction: ChatInputCommandInteraction,
  configs: GuildTicketSettings[],
  settingsService: {
    delete: (guildId: string, categoryId: string) => Promise<void>;
  },
): Promise<{ existing: GuildTicketSettings[]; cleanedUp: number }> {
  const existing: GuildTicketSettings[] = [];
  let cleanedUp = 0;

  for (const config of configs) {
    const channel = (await interaction.client.channels
      .fetch(config.panelChannelId)
      .catch(() => null)) as TextChannel | null;
    if (!channel) {
      await settingsService.delete(config.guildId, config.categoryId);
      cleanedUp++;
      continue;
    }

    const message = await channel.messages
      .fetch(config.panelMessageId)
      .catch(() => null);
    if (!message) {
      await settingsService.delete(config.guildId, config.categoryId);
      cleanedUp++;
      continue;
    }

    existing.push(config);
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
    tInteraction(interaction.locale, "ticket:user-response.panels_cleaned_up", {
      count: cleanedUp,
    }),
    { locale: interaction.locale },
  );
  await interaction.followUp({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
