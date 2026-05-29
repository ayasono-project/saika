// src/bot/features/ticket/handlers/ui/ticketViewSelectHandler.ts
// ticket-settings view カテゴリ選択ハンドラ

import {
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { StringSelectHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../../bot/services/botCompositionRoot";
import { buildPaginationRow } from "../../../../bot/shared/pagination";
import type { GuildTicketSettings } from "../../../../shared/database/types";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { buildSettingsEmbed } from "../../commands/usecases/ticketSettingsView";

/**
 * ticket-settings view のカテゴリ選択メニューを処理するハンドラ
 */
export const ticketViewSelectHandler: StringSelectHandler = {
  /**
   * カスタムIDがビュー選択プレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.VIEW_SELECT_PREFIX);
  },

  /**
   * カテゴリ選択メニューの操作を処理する
   * @param interaction セレクトメニューインタラクション
   */
  async execute(interaction: StringSelectMenuInteraction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    if (!guildId || !guild) return;

    const selectedCategoryId = interaction.values[0];
    const settingsService = getBotTicketSettingsService();
    const ticketRepository = getBotTicketRepository();
    const configs = await settingsService.findAllByGuild(guildId);

    // 選択されたカテゴリのインデックスを取得
    const pageIndex = configs.findIndex(
      (c: GuildTicketSettings) => c.categoryId === selectedCategoryId,
    );
    if (pageIndex < 0) return;

    const config = configs[pageIndex];
    const openTickets = await ticketRepository.findOpenByCategory(
      guildId,
      config.categoryId,
    );
    const embed = buildSettingsEmbed(
      config,
      openTickets.length,
      interaction.locale,
    );

    const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

    // 複数カテゴリがある場合はページネーションとセレクトメニューを表示
    if (configs.length > 1) {
      components.push(
        buildPaginationRow(
          TICKET_CUSTOM_ID.VIEW_PREFIX,
          pageIndex,
          configs.length,
          interaction.locale,
        ),
      );

      const selectOptions = await Promise.all(
        configs.map(async (c: GuildTicketSettings) => {
          let label: string;
          try {
            const channel = await guild.channels.fetch(c.categoryId);
            label = channel?.name ?? c.categoryId;
          } catch {
            label = c.categoryId;
          }
          return {
            label,
            value: c.categoryId,
            default: c.categoryId === selectedCategoryId,
          };
        }),
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(TICKET_CUSTOM_ID.VIEW_SELECT_PREFIX)
        .setPlaceholder(
          tInteraction(interaction.locale, "ticket:ui.select.view_placeholder"),
        )
        .addOptions(selectOptions);

      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu,
        ),
      );
    }

    await interaction.update({ embeds: [embed], components });
  },
};
