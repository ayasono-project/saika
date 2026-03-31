// src/bot/features/guild-config/commands/guildConfigCommand.import.ts
// guild-config import サブコマンド実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import type { GuildConfigExportData } from "../../../../shared/features/guild-config/guildConfigDefaults";
import type { AllParseKeys } from "../../../../shared/locale/i18n";
import {
  localeManager,
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { TtlMap } from "../../../../shared/utils/ttlMap";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../utils/messageResponse";
import {
  CONFIRM_TIMEOUT_MS,
  GUILD_CONFIG_CUSTOM_ID,
} from "../constants/guildConfig.constants";

/** インポート確認待ちのセッション状態 */
interface ImportSession {
  data: GuildConfigExportData;
  warnings: string[];
}

/** TTL付きセッション管理（確認ダイアログのタイムアウトと合わせる） */
export const importSessions: TtlMap<ImportSession> = new TtlMap<ImportSession>(
  CONFIRM_TIMEOUT_MS + 5_000,
);

/**
 * JSONファイルからギルド設定をインポートする
 * @param interaction コマンド実行インタラクション
 * @param guildId インポート先のギルドID
 */
export async function handleImport(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const locale = interaction.locale;
  const service = getBotGuildConfigService();
  const attachment = interaction.options.getAttachment("file", true);

  // JSONファイルをフェッチしてパース
  let parsed: unknown;
  try {
    const response = await fetch(attachment.url);
    const text = await response.text();
    parsed = JSON.parse(text);
  } catch {
    const embed = createErrorEmbed(
      tInteraction(locale, "guildConfig:user-response.import_invalid_json"),
    );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // バリデーション
  const errorKey = service.validateImportData(parsed, guildId);
  if (errorKey) {
    const embed = createErrorEmbed(
      tInteraction(locale, errorKey as AllParseKeys),
    );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const importData = parsed as GuildConfigExportData;

  // チャンネル/ロールIDの存在チェック（警告のみ）
  const warnings: string[] = [];
  if (interaction.guild) {
    const missingIds = checkMissingResources(importData, interaction.guild);
    if (missingIds.length > 0) {
      warnings.push(
        tInteraction(
          locale,
          "guildConfig:user-response.import_missing_channels",
        ),
      );
    }
  }

  // セッションに保存
  const sessionKey = `${guildId}:${interaction.user.id}`;
  importSessions.set(sessionKey, { data: importData, warnings });

  // 確認ダイアログを表示
  const description =
    warnings.length > 0
      ? `${tInteraction(locale, "guildConfig:embed.description.import_confirm")}\n\n${warnings.join("\n")}`
      : tInteraction(locale, "guildConfig:embed.description.import_confirm");

  const confirmEmbed = createWarningEmbed(description, {
    title: tInteraction(locale, "guildConfig:embed.title.import_confirm"),
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.IMPORT_CONFIRM)
      .setEmoji("✅")
      .setLabel(tInteraction(locale, "guildConfig:ui.button.import_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(GUILD_CONFIG_CUSTOM_ID.IMPORT_CANCEL)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "guildConfig:ui.button.import_cancel"))
      .setStyle(ButtonStyle.Secondary),
  );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // ボタン応答を待機
  const collector = response.createMessageComponentCollector({
    time: CONFIRM_TIMEOUT_MS,
    /* istanbul ignore next -- Discord.js collector filter */
    filter: (i) => i.user.id === interaction.user.id,
  });

  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("collect", async (i) => {
    // セッションから取得
    const session = importSessions.get(sessionKey);

    if (i.customId === GUILD_CONFIG_CUSTOM_ID.IMPORT_CONFIRM && session) {
      // インポート実行
      await service.importConfig(guildId, session.data);

      // キャッシュを即時無効化
      localeManager.invalidateLocaleCache(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.import_success"),
      );
      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.guild_config",
          "guildConfig:log.imported",
          { guildId },
        ),
      );
    } else if (i.customId === GUILD_CONFIG_CUSTOM_ID.IMPORT_CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.import_cancelled"),
      );
      await i.update({ embeds: [cancelEmbed], components: [] });
    }

    // セッション削除
    importSessions.delete(sessionKey);
    collector.stop();
  });
  /* istanbul ignore stop */

  // タイムアウト時はキャンセル扱い
  /* istanbul ignore start -- Discord.js collector callback */
  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      importSessions.delete(sessionKey);
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildConfig:user-response.import_cancelled"),
      );
      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}

/**
 * インポートデータ内のチャンネル/ロールIDがサーバーに存在するか確認する
 * @param data インポートデータ
 * @param guild 対象ギルド
 * @returns 存在しないIDの配列
 */
function checkMissingResources(
  data: GuildConfigExportData,
  guild: {
    channels: { cache: { has: (id: string) => boolean } };
    roles: { cache: { has: (id: string) => boolean } };
  },
): string[] {
  const missing: string[] = [];
  const config = data.config as Record<string, unknown>;

  // エラー通知チャンネル
  if (
    typeof config.errorChannelId === "string" &&
    !guild.channels.cache.has(config.errorChannelId)
  ) {
    missing.push(config.errorChannelId);
  }

  // AFK チャンネル
  const afk = config.afk as Record<string, unknown> | undefined;
  if (
    afk?.channelId &&
    typeof afk.channelId === "string" &&
    !guild.channels.cache.has(afk.channelId)
  ) {
    missing.push(afk.channelId);
  }

  // メンバーログ チャンネル
  const memberLog = config.memberLog as Record<string, unknown> | undefined;
  if (
    memberLog?.channelId &&
    typeof memberLog.channelId === "string" &&
    !guild.channels.cache.has(memberLog.channelId)
  ) {
    missing.push(memberLog.channelId);
  }

  // Bumpリマインダー メンションロール
  const bump = config.bumpReminder as Record<string, unknown> | undefined;
  if (
    bump?.mentionRoleId &&
    typeof bump.mentionRoleId === "string" &&
    !guild.roles.cache.has(bump.mentionRoleId)
  ) {
    missing.push(bump.mentionRoleId);
  }

  return missing;
}
