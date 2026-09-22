// コマンド共通チャンネルガード

import { MessageFlags, type RepliableInteraction } from "discord.js";
import { tInteraction } from "../../shared/locale/localeManager";
import { createErrorEmbed } from "../utils/messageResponse";
import { COMMON_I18N_KEYS } from "./i18nKeys";

/**
 * 実行チャンネルがスレッドなら理由を示して拒否する共通ガード。
 * パネルのような恒久設置物はスレッドへ置くとアーカイブ後に一覧から消えて
 * 管理者が見失うため、設置系フローでは実行チャンネルの時点で弾く。
 * @param interaction 実行チャンネルを検証するインタラクション（未応答であること）
 * @returns 拒否した場合 true（呼び出し側はそのまま return する）
 */
export async function rejectThreadChannel(
  interaction: RepliableInteraction,
): Promise<boolean> {
  // isThread() は公開・非公開・アナウンスの3種を覆う（フォーラム投稿も公開スレッド扱い）
  if (!interaction.channel?.isThread()) {
    return false;
  }

  const embed = createErrorEmbed(
    tInteraction(interaction.locale, COMMON_I18N_KEYS.THREAD_NOT_SUPPORTED),
    {
      title: tInteraction(
        interaction.locale,
        COMMON_I18N_KEYS.TITLE_CHANNEL_INVALID,
      ),
      locale: interaction.locale,
    },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
  return true;
}
