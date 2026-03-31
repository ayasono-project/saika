// src/bot/features/ticket/handlers/ui/ticketTeardownSelectHandler.ts
// teardown フローのカテゴリ選択ハンドラ + 確認ダイアログ表示

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { Ticket } from "../../../../../shared/database/types";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotTicketRepository } from "../../../../services/botCompositionRoot";
import { createWarningEmbed } from "../../../../utils/messageResponse";
import {
  TICKET_CUSTOM_ID,
  TICKET_LIST_MAX_DISPLAY,
} from "../../commands/ticketCommand.constants";
import { ticketTeardownSessions } from "./ticketTeardownState";

/**
 * teardown フローのカテゴリ選択メニューを処理するハンドラ
 */
export const ticketTeardownSelectHandler: StringSelectHandler = {
  /**
   * カスタムIDが teardown 選択プレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.TEARDOWN_SELECT_PREFIX);
  },

  /**
   * teardown フローのカテゴリ選択を処理する
   * @param interaction セレクトメニューインタラクション
   */
  async execute(interaction: StringSelectMenuInteraction) {
    const sessionId = interaction.customId.slice(
      TICKET_CUSTOM_ID.TEARDOWN_SELECT_PREFIX.length,
    );
    const categoryIds = interaction.values;
    const guildId = interaction.guildId;
    if (!guildId) return;

    // セッションにカテゴリIDを保存
    ticketTeardownSessions.set(sessionId, { categoryIds });

    await showTeardownConfirmation(
      interaction,
      sessionId,
      categoryIds,
      guildId,
    );
  },
};

/**
 * teardown 確認ダイアログを表示する共通関数
 * usecase（1件スキップ時）とセレクトハンドラの両方から呼ばれる
 * @param interaction コマンドまたはコンポーネントインタラクション
 * @param sessionId teardown セッションID
 * @param categoryIds 削除対象のカテゴリID配列
 * @param guildId ギルドID
 */
export async function showTeardownConfirmation(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  sessionId: string,
  categoryIds: string[],
  guildId: string,
): Promise<void> {
  const ticketRepository = getBotTicketRepository();

  // 選択されたカテゴリのオープンチケットを集約
  const allOpenTickets: Ticket[] = [];
  for (const categoryId of categoryIds) {
    const tickets = await ticketRepository
      .findOpenByCategory(guildId, categoryId)
      .catch(() => [] as Ticket[]);
    allOpenTickets.push(...tickets);
  }

  // 確認 Embed を構築
  const description =
    allOpenTickets.length === 0
      ? tInteraction(
          interaction.locale,
          "ticket:embed.description.teardown_confirm",
        )
      : tInteraction(
          interaction.locale,
          "ticket:embed.description.teardown_warning",
          { count: allOpenTickets.length },
        );

  const embed = createWarningEmbed(description, {
    title: tInteraction(
      interaction.locale,
      "ticket:embed.title.teardown_confirm",
    ),
    locale: interaction.locale,
  });

  // 削除対象カテゴリをフィールドに表示（カテゴリ名で表示）
  const guild =
    "guild" in interaction && interaction.guild ? interaction.guild : null;
  const categoryNames = await Promise.all(
    categoryIds.map(async (id) => {
      if (!guild) return id;
      const ch = await guild.channels.fetch(id).catch(() => null);
      return ch?.name ?? id;
    }),
  );
  embed.addFields({
    name: tInteraction(
      interaction.locale,
      "ticket:embed.field.name.target_categories",
    ),
    value: categoryNames.join(", "),
  });

  // オープンチケットがある場合はフィールドに表示
  if (allOpenTickets.length > 0) {
    const displayed = allOpenTickets.slice(0, TICKET_LIST_MAX_DISPLAY);
    let ticketList = displayed
      .map((ticket: Ticket) => `<#${ticket.channelId}>`)
      .join("\n");
    if (allOpenTickets.length > TICKET_LIST_MAX_DISPLAY) {
      ticketList += `\n${tInteraction(interaction.locale, "ticket:user-response.and_more", { count: allOpenTickets.length - TICKET_LIST_MAX_DISPLAY })}`;
    }

    embed.addFields({
      name: tInteraction(
        interaction.locale,
        "ticket:embed.field.name.open_tickets",
        { count: allOpenTickets.length },
      ),
      value: ticketList,
    });
  }

  // 確認・キャンセルボタン
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX}${sessionId}`)
      .setEmoji("⚠️")
      .setLabel(
        tInteraction(interaction.locale, "ticket:ui.button.teardown_confirm"),
      )
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${TICKET_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX}${sessionId}`)
      .setEmoji("❌")
      .setLabel(tInteraction(interaction.locale, "common:ui.button.cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  // ChatInputCommand（1件スキップ時）は reply、MessageComponent（セレクト選択時）は update
  if ("update" in interaction && typeof interaction.update === "function") {
    await interaction.update({
      embeds: [embed],
      components: [buttons],
    });
  } else {
    await interaction.reply({
      embeds: [embed],
      components: [buttons],
      flags: 64, // MessageFlags.Ephemeral
    });
  }
}
