// src/bot/features/guild-config/commands/guildConfigCommand.export.ts
// guild-config export サブコマンド実行処理

import {
  AttachmentBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../utils/messageResponse";

/**
 * ギルド設定をJSON形式でエクスポートする
 * @param interaction コマンド実行インタラクション
 * @param guildId エクスポート対象のギルドID
 */
export async function handleExport(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;
  const service = getBotGuildConfigService();

  // 全設定を取得しエクスポートJSON構造に変換
  const exportData = await service.exportConfig(guildId);

  // 設定が存在しない場合はエラーメッセージを返す
  if (!exportData) {
    const embed = createErrorEmbed(
      tInteraction(locale, "guildConfig:user-response.export_empty"),
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // JSONファイルを生成
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `guild-config-${guildId}-${timestamp}.json`;
  const jsonContent = JSON.stringify(exportData, null, 2);
  const attachment = new AttachmentBuilder(Buffer.from(jsonContent), {
    name: fileName,
  });

  const embed = createSuccessEmbed(
    tInteraction(locale, "guildConfig:user-response.export_success"),
  );

  await interaction.reply({
    embeds: [embed],
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed("system:log_prefix.guild_config", "guildConfig:log.exported", {
      guildId,
    }),
  );
}
