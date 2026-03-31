// src/bot/features/guild-config/commands/guildConfigCommand.view.ts
// guild-config view サブコマンド実行処理（ページネーション付き設定一覧表示）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type MessageActionRowComponentBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import type { AllParseKeys } from "../../../../shared/locale/i18n";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { disableComponentsAfterTimeout } from "../../../shared/disableComponentsAfterTimeout";
import { buildPaginationRow } from "../../../shared/pagination";
import {
  GUILD_CONFIG_CUSTOM_ID,
  GUILD_CONFIG_PREFIX,
  VIEW_PAGES,
  VIEW_TIMEOUT_MS,
} from "../constants/guildConfig.constants";
import { buildPage } from "./guildConfigCommand.viewPages";

/**
 * ギルド設定一覧をページ形式で表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 表示対象のギルドID
 */
export async function handleView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;
  const totalPages = VIEW_PAGES.length;

  // 1ページ目の Embed を生成
  const embed = await buildPage(0, guildId, locale);
  const components = buildViewComponents(0, totalPages, locale);

  await interaction.reply({
    embeds: [embed],
    components,
    flags: MessageFlags.Ephemeral,
  });

  // タイムアウト後にコンポーネントを無効化
  disableComponentsAfterTimeout(interaction, components, VIEW_TIMEOUT_MS);
}

/**
 * view のコンポーネント行を生成する
 * @param currentPage 現在のページ番号（0-indexed）
 * @param totalPages 総ページ数
 * @param locale interaction.locale
 * @returns ActionRow 配列
 */
export function buildViewComponents(
  currentPage: number,
  totalPages: number,
  locale: string,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  // Row 1: ページネーションボタン（単ページ時は非表示）
  if (totalPages > 1) {
    rows.push(
      buildPaginationRow(GUILD_CONFIG_PREFIX, currentPage, totalPages, locale),
    );
  }

  // Row 2: ページセレクトメニュー
  rows.push(buildPageSelectRow(currentPage, locale));

  return rows;
}

/**
 * ページセレクトメニュー行を生成する
 * @param currentPage 現在のページ番号（0-indexed）
 * @param locale interaction.locale
 * @returns セレクトメニュー ActionRow
 */
function buildPageSelectRow(
  currentPage: number,
  locale: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = VIEW_PAGES.map((page, index) => ({
    label: `${index + 1}. ${page.emoji} ${tInteraction(locale, page.labelKey as AllParseKeys)}`,
    value: page.value,
    default: index === currentPage,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT)
    .setPlaceholder(
      tInteraction(locale, "guildConfig:ui.select.view_placeholder"),
    )
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * view のページ更新用 Embed + Components を生成する
 * @param pageIndex 表示するページ番号（0-indexed）
 * @param guildId 表示対象のギルドID
 * @param locale interaction.locale
 * @returns embed と components のペア
 */
export async function buildViewPayload(
  pageIndex: number,
  guildId: string,
  locale: string,
): Promise<{
  embed: EmbedBuilder;
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}> {
  const embed = await buildPage(pageIndex, guildId, locale);
  const components = buildViewComponents(pageIndex, VIEW_PAGES.length, locale);
  return { embed, components };
}
