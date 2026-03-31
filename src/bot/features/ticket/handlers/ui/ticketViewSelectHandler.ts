// src/bot/features/ticket/handlers/ui/ticketViewSelectHandler.ts
// ticket-config view カテゴリ選択ハンドラ

import {
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { GuildTicketConfig } from "../../../../../shared/database/types";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import { buildPaginationRow } from "../../../../shared/pagination";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { buildConfigEmbed } from "../../commands/usecases/ticketConfigView";

/**
 * ticket-config view のカテゴリ選択メニューを処理するハンドラ
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
    const configService = getBotTicketConfigService();
    const ticketRepository = getBotTicketRepository();
    const configs = await configService.findAllByGuild(guildId);

    // 選択されたカテゴリのインデックスを取得
    const pageIndex = configs.findIndex(
      (c: GuildTicketConfig) => c.categoryId === selectedCategoryId,
    );
    if (pageIndex < 0) return;

    const config = configs[pageIndex];
    const openTickets = await ticketRepository.findOpenByCategory(
      guildId,
      config.categoryId,
    );
    const embed = buildConfigEmbed(
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
        configs.map(async (c: GuildTicketConfig) => {
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
