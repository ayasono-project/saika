// src/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown.ts
// vc-recruit-config teardown のユースケース処理（ステップ1: セレクトメニュー表示）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { VcRecruitSetup } from "../../../../../shared/database/types";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotVcRecruitConfigService } from "../../../../services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../../shared/disableComponentsAfterTimeout";
import { COMMON_I18N_KEYS } from "../../../../shared/i18nKeys";
import {
  DISCORD_SELECT_MAX_OPTIONS,
  VC_RECRUIT_TEARDOWN_CUSTOM_ID,
  VC_RECRUIT_TIMEOUT,
} from "../vcRecruitConfigCommand.constants";

/**
 * teardown セレクトメニューのオプション一覧を構築する（コマンド初回表示・やり直し共用）
 * @param guild 対象ギルド
 * @param locale ユーザーのロケール
 * @param setups セットアップ情報の配列
 * @returns セレクトメニューオプションの配列
 */
export function buildTeardownSelectOptions(
  guild: Guild,
  locale: string,
  setups: VcRecruitSetup[],
): StringSelectMenuOptionBuilder[] {
  return setups.map((setup) => {
    let label: string;
    if (setup.categoryId === null) {
      label = tInteraction(locale, "vcRecruit:ui.select.teardown_top");
    } else {
      const cat = guild.channels.cache.get(setup.categoryId);
      if (cat) {
        label = cat.name;
      } else {
        label = tInteraction(
          locale,
          "vcRecruit:ui.select.teardown_unknown_category",
          { id: setup.categoryId },
        );
      }
    }
    return new StringSelectMenuOptionBuilder()
      .setValue(setup.panelChannelId)
      .setLabel(label);
  });
}

/**
 * vc-recruit-config teardown を実行する（ステップ1: セレクトメニュー表示）
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 */
export async function handleVcRecruitConfigTeardown(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  const repo = getBotVcRecruitConfigService();
  const config = await repo.getVcRecruitConfigOrDefault(guildId);

  if (config.setups.length === 0) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vcRecruit:user-response.not_setup"),
    );
  }

  // セットアップごとのセレクトオプションを構築
  const options = buildTeardownSelectOptions(
    guild,
    interaction.locale,
    config.setups,
  );

  const placeholder = tInteraction(
    interaction.locale,
    "vcRecruit:ui.select.teardown_placeholder",
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      `${VC_RECRUIT_TEARDOWN_CUSTOM_ID.SELECT_PREFIX}${interaction.id}`,
    )
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(Math.min(config.setups.length, DISCORD_SELECT_MAX_OPTIONS))
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
    VC_RECRUIT_TIMEOUT.COMPONENT_DISABLE_MS,
  );
}
