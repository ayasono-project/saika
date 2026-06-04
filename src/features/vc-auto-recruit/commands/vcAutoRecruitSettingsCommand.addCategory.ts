// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.addCategory.ts
// vc-auto-recruit-settings add-category 実行処理
// 未登録のカテゴリ（TOP 含む）を複数選択メニューで提示し、選択時に一括で募集対象へ追加する（選択応答は select ハンドラ）

import { ValidationError } from "@ayasono/shared/core";
import {
  ActionRowBuilder,
  type CategoryChannel,
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../bot/shared/disableComponentsAfterTimeout";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";
import { VC_AUTO_RECRUIT_ROOT_CATEGORY } from "../constants/vcAutoRecruit.constants";
import {
  VC_AUTO_RECRUIT_CATEGORY_SELECT_TIMEOUT_MS,
  VC_AUTO_RECRUIT_SETTINGS_COMMAND,
} from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/** Discord のセレクトメニュー最大選択肢数 */
const SELECT_MENU_MAX_OPTIONS = 25;

/**
 * 募集対象へ追加するカテゴリを選ぶセレクトメニューを表示する。
 * 未登録のカテゴリ（TOP 含む）を複数選択でき、選択時に一括追加する。
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsAddCategory(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const locale = interaction.locale;
  const config =
    await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
      guildId,
    );
  const enabled = new Set(config.enabledCategoryIds);

  // 未登録の TOP（ルート直下）を先頭候補にする
  const options: StringSelectMenuOptionBuilder[] = [];
  if (!enabled.has(VC_AUTO_RECRUIT_ROOT_CATEGORY)) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.category_top_label",
          ),
        )
        .setValue(VC_AUTO_RECRUIT_ROOT_CATEGORY),
    );
  }

  // 未登録のカテゴリを表示順に並べて候補へ追加する
  const categories = [...guild.channels.cache.values()]
    .filter(
      (channel): channel is CategoryChannel =>
        channel.type === ChannelType.GuildCategory && !enabled.has(channel.id),
    )
    .sort((a, b) => a.position - b.position);
  for (const category of categories) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(category.id),
    );
  }

  const limitedOptions = options.slice(0, SELECT_MENU_MAX_OPTIONS);

  // 追加できる候補が無い場合は案内のみ
  if (limitedOptions.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.no_addable_categories",
          ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(VC_AUTO_RECRUIT_SETTINGS_COMMAND.ADD_CATEGORY_SELECT_ID)
    .setPlaceholder(
      tInteraction(locale, "vcAutoRecruit:ui.select.add_category_placeholder"),
    )
    .setMinValues(1)
    .setMaxValues(limitedOptions.length)
    .addOptions(limitedOptions);

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.reply({
    components: [selectRow],
    flags: MessageFlags.Ephemeral,
  });

  // 一定時間操作が無ければメニューを無効化する
  disableComponentsAfterTimeout(
    interaction,
    [selectRow],
    VC_AUTO_RECRUIT_CATEGORY_SELECT_TIMEOUT_MS,
  );
}
