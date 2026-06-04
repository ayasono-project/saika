// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.disableCategory.ts
// vc-auto-recruit-settings disable-category 実行処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { VC_AUTO_RECRUIT_ROOT_CATEGORY } from "../constants/vcAutoRecruit.constants";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * 募集対象カテゴリ（allowlist）を無効化する。カテゴリ省略時は TOP（ルート直下）を無効化する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsDisableCategory(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  const locale = interaction.locale;

  // カテゴリオプション（省略時は TOP）を解決
  const categoryOption = interaction.options.getChannel(
    VC_AUTO_RECRUIT_SETTINGS_COMMAND.OPTION.CATEGORY,
    false,
  );

  // カテゴリ以外のチャンネルが渡された場合は拒否
  if (categoryOption && categoryOption.type !== ChannelType.GuildCategory) {
    throw new ValidationError(
      tInteraction(locale, "vcAutoRecruit:user-response.not_a_category"),
    );
  }

  // 対象キー（カテゴリ ID または sentinel "TOP"）と表示ラベルを決定
  const categoryKey = categoryOption?.id ?? VC_AUTO_RECRUIT_ROOT_CATEGORY;
  const categoryLabel = categoryOption
    ? `<#${categoryOption.id}>`
    : tInteraction(locale, "vcAutoRecruit:user-response.category_top_label");

  const removed =
    await getBotVcAutoRecruitSettingsService().removeEnabledCategory(
      guildId,
      categoryKey,
    );

  // 未登録の場合は警告メッセージを返す（冪等）
  if (!removed) {
    await interaction.reply({
      embeds: [
        createWarningEmbed(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.category_not_found",
            { category: categoryLabel },
          ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        tInteraction(locale, "vcAutoRecruit:user-response.category_disabled", {
          category: categoryLabel,
        }),
        { title: tInteraction(locale, "common:embed.title.success") },
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.vc_auto_recruit",
      "vcAutoRecruit:log.config_category_disabled",
      { guildId, categoryId: categoryKey },
    ),
  );
}
