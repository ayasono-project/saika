// src/bot/features/ticket/handlers/ui/ticketViewButtonHandler.ts
// ticket-config view ページネーションボタンハンドラ

import {
  ActionRowBuilder,
  type ButtonInteraction,
  ComponentType,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { GuildTicketConfig } from "../../../../../shared/database/types";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import {
  buildPaginationRow,
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "../../../../shared/pagination";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { buildConfigEmbed } from "../../commands/usecases/ticketConfigView";

/**
 * ticket-config view のページネーションボタンを処理するハンドラ
 */
export const ticketViewButtonHandler: ButtonHandler = {
  /**
   * カスタムIDがビューページネーションプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return (
      parsePaginationAction(customId, TICKET_CUSTOM_ID.VIEW_PREFIX) !== null
    );
  },

  /**
   * ページネーションボタンの操作を処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    if (!guildId || !guild) return;

    const configService = getBotTicketConfigService();
    const ticketRepository = getBotTicketRepository();
    const configs = await configService.findAllByGuild(guildId);
    const totalPages = configs.length;
    if (totalPages === 0) return;

    const action = parsePaginationAction(
      interaction.customId,
      TICKET_CUSTOM_ID.VIEW_PREFIX,
    );
    if (!action) return;

    // 現在ページを復元
    const currentPage = getCurrentPageFromConfigs(interaction, configs);

    let newPage: number;

    // ジャンプの場合はモーダルでページ番号を入力、それ以外はアクションからページを算出
    if (action === "jump") {
      const input = await showPaginationJumpModal(
        interaction,
        TICKET_CUSTOM_ID.VIEW_PREFIX,
        totalPages,
        interaction.locale,
      );
      if (!input) return;

      const pageNum = parseInt(input, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) return;
      newPage = pageNum - 1;
    } else {
      newPage = resolvePageFromAction(action, currentPage, totalPages);
      if (newPage === currentPage) {
        await interaction.deferUpdate();
        return;
      }
    }

    // 新しいページの Embed を生成
    const config = configs[newPage];
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

    // 複数ページある場合はページネーションとセレクトメニューを表示
    if (totalPages > 1) {
      components.push(
        buildPaginationRow(
          TICKET_CUSTOM_ID.VIEW_PREFIX,
          newPage,
          totalPages,
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
            default: c.categoryId === config.categoryId,
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

    // jump はモーダル応答後なので editReply、それ以外はボタン応答なので update
    if (action === "jump") {
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.update({ embeds: [embed], components });
    }
  },
};

/**
 * 現在のページを設定一覧から復元する
 * @param interaction ボタンインタラクション
 * @param configs チケット設定一覧
 * @returns 現在のページインデックス（デフォルト 0）
 */
function getCurrentPageFromConfigs(
  interaction: ButtonInteraction,
  configs: GuildTicketConfig[],
): number {
  // メッセージのセレクトメニューのデフォルト値からページを特定
  for (const row of interaction.message.components) {
    if (row.type !== ComponentType.ActionRow) continue;
    for (const component of row.components) {
      if (
        component.type === ComponentType.StringSelect &&
        "options" in component
      ) {
        const options = component.options as Array<{
          value: string;
          default: boolean;
        }>;
        const defaultOption = options.find((o) => o.default);
        if (defaultOption) {
          const index = configs.findIndex(
            (c) => c.categoryId === defaultOption.value,
          );
          if (index >= 0) return index;
        }
      }
    }
  }
  return 0;
}
