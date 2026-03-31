// src/bot/features/ticket/commands/usecases/ticketConfigView.ts
// チケット設定一覧表示処理

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type MessageActionRowComponentBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type TextChannel,
} from "discord.js";
import type { GuildTicketConfig } from "../../../../../shared/database/types";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import { buildPaginationRow } from "../../../../shared/pagination";
import {
  createErrorEmbed,
  createInfoEmbed,
} from "../../../../utils/messageResponse";
import {
  parseStaffRoleIds,
  TICKET_CUSTOM_ID,
} from "../ticketCommand.constants";

/**
 * 単一設定の Embed を生成する
 * @param config チケット設定
 * @param openCount オープンチケット数
 * @param locale インタラクションロケール
 * @returns 設定情報 Embed
 */
export function buildConfigEmbed(
  config: GuildTicketConfig,
  openCount: number,
  locale: string,
): EmbedBuilder {
  const staffRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);
  const roleMentions = staffRoleIds.map((id) => `<@&${id}>`).join(" ");

  return createInfoEmbed("", {
    title: tInteraction(locale, "ticket:embed.title.config_view"),
    locale,
  }).addFields(
    {
      name: tInteraction(locale, "ticket:embed.field.name.category"),
      value: `<#${config.categoryId}>`,
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.staff_roles"),
      value: roleMentions || "-",
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.auto_delete"),
      value: tInteraction(locale, "ticket:embed.field.value.auto_delete_days", {
        days: config.autoDeleteDays,
      }),
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.max_tickets"),
      value: tInteraction(
        locale,
        "ticket:embed.field.value.max_tickets_count",
        { count: config.maxTicketsPerUser },
      ),
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.panel_channel"),
      value: `<#${config.panelChannelId}>`,
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.panel_color"),
      value: config.panelColor,
      inline: true,
    },
    {
      name: tInteraction(locale, "ticket:embed.field.name.open_ticket_count"),
      value: tInteraction(
        locale,
        "ticket:embed.field.value.open_ticket_count",
        { count: openCount },
      ),
      inline: true,
    },
  );
}

/**
 * ticket-config view サブコマンドを処理する
 * @param interaction コマンド実行インタラクション
 * @param guildId ギルドID
 */
export async function handleTicketConfigView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const configService = getBotTicketConfigService();
  const ticketRepository = getBotTicketRepository();
  const allConfigs = await configService.findAllByGuild(guildId);
  const locale = interaction.locale;

  // メッセージ存在確認 → 不在パネルを DB 削除して除外
  const { existing: configs, cleanedUp } = await filterExistingConfigs(
    interaction,
    allConfigs,
    configService,
  );

  if (configs.length === 0) {
    const embed =
      allConfigs.length > 0
        ? createErrorEmbed(
            tInteraction(locale, "ticket:user-response.panel_not_found"),
            { locale },
          )
        : createInfoEmbed(
            tInteraction(locale, "ticket:user-response.no_configs"),
            { locale },
          );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 最初の設定の Embed を生成
  const firstConfig = configs[0];
  const openTickets = await ticketRepository.findOpenByCategory(
    guildId,
    firstConfig.categoryId,
  );
  const embed = buildConfigEmbed(firstConfig, openTickets.length, locale);

  const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  // 複数設定がある場合はページネーションとカテゴリ選択メニューを追加
  if (configs.length > 1) {
    // ページネーション行
    components.push(
      buildPaginationRow(
        TICKET_CUSTOM_ID.VIEW_PREFIX,
        0,
        configs.length,
        locale,
      ),
    );

    // カテゴリ選択メニュー
    const selectOptions = await Promise.all(
      configs.map(async (config: GuildTicketConfig) => {
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
      .setCustomId(TICKET_CUSTOM_ID.VIEW_SELECT_PREFIX)
      .setPlaceholder(tInteraction(locale, "ticket:ui.select.view_placeholder"))
      .addOptions(selectOptions);

    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
    );
  }

  await interaction.reply({
    embeds: [embed],
    components,
    flags: MessageFlags.Ephemeral,
  });

  // クリーンアップが発生した場合は通知
  if (cleanedUp > 0) {
    const cleanupEmbed = createInfoEmbed(
      tInteraction(locale, "ticket:user-response.panels_cleaned_up", {
        count: cleanedUp,
      }),
      { locale },
    );
    await interaction.followUp({
      embeds: [cleanupEmbed],
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * 設定一覧からパネルメッセージが存在するもののみを返す
 * 不在パネルは DB レコードを削除する
 */
async function filterExistingConfigs(
  interaction: ChatInputCommandInteraction,
  configs: GuildTicketConfig[],
  configService: {
    delete: (guildId: string, categoryId: string) => Promise<void>;
  },
): Promise<{ existing: GuildTicketConfig[]; cleanedUp: number }> {
  const existing: GuildTicketConfig[] = [];
  let cleanedUp = 0;

  for (const config of configs) {
    const channel = (await interaction.client.channels
      .fetch(config.panelChannelId)
      .catch(() => null)) as TextChannel | null;
    if (!channel) {
      await configService.delete(config.guildId, config.categoryId);
      cleanedUp++;
      continue;
    }

    const message = await channel.messages
      .fetch(config.panelMessageId)
      .catch(() => null);
    if (!message) {
      await configService.delete(config.guildId, config.categoryId);
      cleanedUp++;
      continue;
    }

    existing.push(config);
  }

  return { existing, cleanedUp };
}
