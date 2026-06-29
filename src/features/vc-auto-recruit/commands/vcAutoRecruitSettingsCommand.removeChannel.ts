// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.removeChannel.ts
// vc-auto-recruit-settings remove-channel 実行処理
// 登録済みの募集対象 VC チャンネルを複数選択メニューで提示し、選択時に一括解除する（選択応答は select ハンドラ）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../bot/shared/disableComponentsAfterTimeout";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";
import {
  VC_AUTO_RECRUIT_CHANNEL_SELECT_TIMEOUT_MS,
  VC_AUTO_RECRUIT_SETTINGS_COMMAND,
} from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/** Discord のセレクトメニュー最大選択肢数 */
const SELECT_MENU_MAX_OPTIONS = 25;

/**
 * 募集対象から解除する VC チャンネルを選ぶセレクトメニューを表示する。
 * 登録済み VC チャンネルを複数選択でき、選択時に一括解除する。
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsRemoveChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  const locale = interaction.locale;
  const config =
    await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
      guildId,
    );

  // 解除対象が無い場合は案内のみ
  if (config.enabledChannelIds.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.no_enabled_channels",
          ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 登録済みチャンネルを選択肢へ変換（キャッシュ未取得時は ID にフォールバック）
  const options = config.enabledChannelIds
    .slice(0, SELECT_MENU_MAX_OPTIONS)
    .map((id) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(interaction.guild?.channels.cache.get(id)?.name ?? id)
        .setValue(id),
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId(VC_AUTO_RECRUIT_SETTINGS_COMMAND.REMOVE_CHANNEL_SELECT_ID)
    .setPlaceholder(
      tInteraction(
        locale,
        "vcAutoRecruit:ui.select.remove_channel_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

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
    VC_AUTO_RECRUIT_CHANNEL_SELECT_TIMEOUT_MS,
  );
}
