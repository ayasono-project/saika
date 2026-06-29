// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.addChannel.ts
// vc-auto-recruit-settings add-channel 実行処理
// 未登録の VC チャンネルを複数選択メニューで提示し、選択時に一括で募集対象へ追加する（選択応答は select ハンドラ）

import { ValidationError } from "@ayasono/shared/core";
import {
  ActionRowBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type VoiceChannel,
} from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { disableComponentsAfterTimeout } from "../../../bot/shared/disableComponentsAfterTimeout";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import {
  createInfoEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";
import { getVacSettingsService } from "../../vac/vacSettingsService";
import {
  VC_AUTO_RECRUIT_CHANNEL_SELECT_TIMEOUT_MS,
  VC_AUTO_RECRUIT_SETTINGS_COMMAND,
} from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/** Discord のセレクトメニュー最大選択肢数 */
const SELECT_MENU_MAX_OPTIONS = 25;

/**
 * 募集対象へ追加する VC チャンネルを選ぶセレクトメニューを表示する。
 * 未登録かつ VAC トリガー以外の VC チャンネルを複数選択でき、選択時に一括追加する。
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsAddChannel(
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
  const [config, vacSettings] = await Promise.all([
    getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
      guildId,
    ),
    getVacSettingsService().getVacSettingsOrDefault(guildId),
  ]);

  const registered = new Set(config.enabledChannelIds);
  const vacTriggers = new Set(vacSettings.triggerChannelIds);

  // 未登録・VAC トリガー・AFK 以外の VC チャンネルを位置順に並べる
  const candidates = [...guild.channels.cache.values()]
    .filter(
      (ch): ch is VoiceChannel =>
        ch.type === ChannelType.GuildVoice &&
        !registered.has(ch.id) &&
        !vacTriggers.has(ch.id) &&
        ch.id !== guild.afkChannelId,
    )
    .sort((a, b) => {
      const parentPosA = a.parent?.position ?? -1;
      const parentPosB = b.parent?.position ?? -1;
      if (parentPosA !== parentPosB) return parentPosA - parentPosB;
      return a.position - b.position;
    });

  // 追加できる候補が無い場合は案内のみ
  if (candidates.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.no_addable_channels",
          ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isTruncated = candidates.length > SELECT_MENU_MAX_OPTIONS;
  const limited = candidates.slice(0, SELECT_MENU_MAX_OPTIONS);

  const options = limited.map((ch) =>
    new StringSelectMenuOptionBuilder().setLabel(ch.name).setValue(ch.id),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(VC_AUTO_RECRUIT_SETTINGS_COMMAND.ADD_CHANNEL_SELECT_ID)
    .setPlaceholder(
      tInteraction(locale, "vcAutoRecruit:ui.select.add_channel_placeholder"),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const embeds = isTruncated
    ? [
        createWarningEmbed(
          tInteraction(
            locale,
            "vcAutoRecruit:user-response.add_channel_truncated",
          ),
        ),
      ]
    : [];

  await interaction.reply({
    embeds,
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
