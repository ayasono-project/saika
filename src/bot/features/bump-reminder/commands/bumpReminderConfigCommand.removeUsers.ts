// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeUsers.ts
// bump-reminder-config remove-mention-users 実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotBumpReminderConfigService } from "../../../services/botCompositionRoot";
import {
  buildPaginationRow,
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "../../../shared/pagination";
import {
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../utils/messageResponse";

/** 1ページあたりのユーザー数（StringSelectMenu の上限） */
const PAGE_SIZE = 25;

/** コレクターのタイムアウト（ms） */
const COLLECTOR_TIMEOUT_MS = 300_000;

const PREFIX = "bump-reminder";

const CUSTOM_ID = {
  USER_SELECT: `${PREFIX}:user-select`,
  ALL_SELECT: `${PREFIX}:all-user-select`,
  DELETE: `${PREFIX}:user-delete`,
} as const;

/**
 * 通知ユーザーを選択して削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 */
export async function handleBumpReminderConfigRemoveUsers(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;

  // 登録ユーザーを取得
  const config =
    await getBotBumpReminderConfigService().getBumpReminderConfigOrDefault(
      guildId,
    );
  const allUserIds = config.mentionUserIds;

  if (allUserIds.length === 0) {
    throw new ValidationError(
      tInteraction(locale, "bumpReminder:user-response.remove_users_empty"),
    );
  }

  let currentPage = 0;
  const selectedIds = new Set<string>();

  const totalPages = Math.ceil(allUserIds.length / PAGE_SIZE);

  const buildReplyPayload = (page: number) => {
    const start = page * PAGE_SIZE;
    const pageUserIds = allUserIds.slice(start, start + PAGE_SIZE);

    // Embed: ユーザー一覧（選択済みは取り消し線）
    const userListText = pageUserIds
      .map((id, i) => {
        const num = start + i + 1;
        const mention = `<@${id}>`;
        return selectedIds.has(id)
          ? `${num}. ~~${mention}~~`
          : `${num}. ${mention}`;
      })
      .join("\n");

    const embed = createInfoEmbed(
      tInteraction(locale, "bumpReminder:embed.description.remove_users"),
      {
        title: tInteraction(locale, "bumpReminder:embed.title.remove_users"),
        fields: [{ name: "\u200b", value: userListText || "\u200b" }],
      },
    );

    const components: ActionRowBuilder<
      ButtonBuilder | StringSelectMenuBuilder
    >[] = [];

    // Row 1: ページネーション（複数ページ時のみ）
    if (totalPages > 1) {
      components.push(buildPaginationRow(PREFIX, page, totalPages, locale));
    }

    // Row 2: セレクトメニュー
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.USER_SELECT)
      .setMinValues(0)
      .setMaxValues(pageUserIds.length)
      .addOptions(
        pageUserIds.map((id, i) => ({
          label: `${start + i + 1}. <@${id}>`,
          value: id,
          default: selectedIds.has(id),
        })),
      );
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
    );

    // Row 3: 一括選択ボタン + 削除ボタン
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_ID.ALL_SELECT)
        .setEmoji("☑️")
        .setLabel(tInteraction(locale, "bumpReminder:ui.button.select_all"))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_ID.DELETE)
        .setEmoji("🗑️")
        .setLabel(tInteraction(locale, "bumpReminder:ui.button.submit_delete"))
        .setStyle(ButtonStyle.Danger)
        .setDisabled(selectedIds.size === 0),
    );
    components.push(actionRow);

    return { embeds: [embed], components };
  };

  const response = await interaction.reply({
    ...buildReplyPayload(0),
    flags: MessageFlags.Ephemeral,
  });

  const collector = response.createMessageComponentCollector({
    time: COLLECTOR_TIMEOUT_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  let handledByCollect = false;

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    // ページネーション
    const pageAction = parsePaginationAction(i.customId, PREFIX);
    if (pageAction && pageAction !== "jump") {
      currentPage = resolvePageFromAction(pageAction, currentPage, totalPages);
      await i.update(buildReplyPayload(currentPage)).catch(() => {});
      return;
    }
    if (pageAction === "jump") {
      const raw = await showPaginationJumpModal(i, PREFIX, totalPages, locale);
      if (raw !== null) {
        const pageNum = parseInt(raw, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          currentPage = pageNum - 1;
        } else {
          await interaction
            .followUp({
              embeds: [
                createWarningEmbed(
                  tInteraction(
                    locale,
                    "messageDelete:user-response.jump_invalid_page",
                    { total: totalPages },
                  ),
                  {
                    title: tInteraction(locale, "common:title_invalid_input"),
                  },
                ),
              ],
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
      await interaction
        .editReply(buildReplyPayload(currentPage))
        .catch(() => {});
      return;
    }

    // セレクトメニュー
    if (i.customId === CUSTOM_ID.USER_SELECT && i.isStringSelectMenu()) {
      // 現ページのユーザーの選択状態をリセットしてから選択値を反映
      const start = currentPage * PAGE_SIZE;
      const pageUserIds = allUserIds.slice(start, start + PAGE_SIZE);
      for (const id of pageUserIds) {
        selectedIds.delete(id);
      }
      for (const id of i.values) {
        selectedIds.add(id);
      }
      await i.update(buildReplyPayload(currentPage)).catch(() => {});
      return;
    }

    // 全員選択
    if (i.customId === CUSTOM_ID.ALL_SELECT) {
      for (const id of allUserIds) {
        selectedIds.add(id);
      }
      await i.update(buildReplyPayload(currentPage)).catch(() => {});
      return;
    }

    // 削除実行（選択ユーザーを一括除外して 1 回の書き込みで完了）
    if (i.customId === CUSTOM_ID.DELETE) {
      const configService = getBotBumpReminderConfigService();
      const currentConfig =
        await configService.getBumpReminderConfigOrDefault(guildId);
      currentConfig.mentionUserIds = currentConfig.mentionUserIds.filter(
        (id) => !selectedIds.has(id),
      );
      await configService.saveBumpReminderConfig(guildId, currentConfig);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "bumpReminder:user-response.remove_users_success"),
        {
          title: tInteraction(locale, "common:embed.title.success"),
        },
      );

      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.config_users_removed",
          { guildId, userIds: [...selectedIds].join(",") },
        ),
      );

      handledByCollect = true;
      collector.stop();
    }
  });
  /* istanbul ignore stop */

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (handledByCollect) return;
    if (reason === "time") {
      await interaction
        .editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(locale, "common:interaction.timeout"),
              { title: tInteraction(locale, "common:title_timeout") },
            ),
          ],
          components: [],
        })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}
