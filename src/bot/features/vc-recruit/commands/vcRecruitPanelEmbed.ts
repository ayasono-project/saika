// src/bot/features/vc-recruit/commands/vcRecruitPanelEmbed.ts
// VC募集パネルの Embed + ボタン構築（setup・再送信で共通利用）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { tGuild } from "../../../../shared/locale/localeManager";
import {
  VC_RECRUIT_PANEL_COLOR,
  VC_RECRUIT_PANEL_CUSTOM_ID,
} from "./vcRecruitConfigCommand.constants";

/**
 * VC募集パネルの Embed とボタン行を構築する
 * @param guildId ギルドID
 * @param panelChannelId パネルチャンネルID（ボタンの customId に使用）
 * @returns パネル用の Embed とボタン行
 */
export async function buildVcRecruitPanelComponents(
  guildId: string,
  panelChannelId: string,
): Promise<{
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
}> {
  const panelTitle = await tGuild(guildId, "vcRecruit:embed.title.panel");
  const panelDescription = await tGuild(
    guildId,
    "vcRecruit:embed.description.panel",
  );
  const createButtonLabel = await tGuild(
    guildId,
    "vcRecruit:ui.button.create_recruit",
  );

  const embed = new EmbedBuilder()
    .setTitle(panelTitle)
    .setDescription(panelDescription)
    .setColor(VC_RECRUIT_PANEL_COLOR);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${VC_RECRUIT_PANEL_CUSTOM_ID.CREATE_BUTTON_PREFIX}${panelChannelId}`,
      )
      .setLabel(createButtonLabel)
      .setEmoji("📢")
      .setStyle(ButtonStyle.Success),
  );

  return { embed, row };
}
