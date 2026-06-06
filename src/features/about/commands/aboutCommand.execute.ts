// src/features/about/commands/aboutCommand.execute.ts
// about コマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { getAppVersion } from "../../../shared/config/appVersion";
import { env } from "../../../shared/config/env";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import { tInteraction } from "../../../shared/locale/localeManager";

const ABOUT_I18N_KEYS = {
  EMBED_TITLE: "about:embed.title",
  EMBED_DESCRIPTION: "about:embed.description",
  FIELD_NAME_VERSION: "about:embed.field.name.version",
  FIELD_NAME_OFFICIAL: "about:embed.field.name.official",
  FIELD_VALUE_OFFICIAL: "about:embed.field.value.official",
} as const;

/**
 * about コマンド実行入口
 * Bot のバージョンと公式リンクを表示する
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeAboutCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const locale = interaction.locale;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.ABOUT)
    .setTitle(tInteraction(locale, ABOUT_I18N_KEYS.EMBED_TITLE))
    .setDescription(tInteraction(locale, ABOUT_I18N_KEYS.EMBED_DESCRIPTION))
    .addFields({
      name: tInteraction(locale, ABOUT_I18N_KEYS.FIELD_NAME_VERSION),
      value: `v${getAppVersion()}`,
      inline: true,
    });

  // 公式サイト（ayasono プロジェクト LP）の URL は env で出し分け。
  // LP 公開後に OFFICIAL_URL を設定すると表示される（未設定時は省略し死にリンクを出さない）。
  if (env.OFFICIAL_URL) {
    embed.addFields({
      name: tInteraction(locale, ABOUT_I18N_KEYS.FIELD_NAME_OFFICIAL),
      value: tInteraction(locale, ABOUT_I18N_KEYS.FIELD_VALUE_OFFICIAL, {
        url: env.OFFICIAL_URL,
      }),
    });
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
