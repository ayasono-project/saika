// src/bot/features/guild-settings/commands/guildSettingsCommand.import.ts
// guild-settings import サブコマンド実行処理

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type EmbedField,
  MessageFlags,
} from "discord.js";
import { getBotGuildSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import type { ImportMergePlan } from "../../../shared/database/types";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import {
  localeManager,
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TtlMap } from "../../../shared/utils/ttlMap";
import {
  CONFIRM_TIMEOUT_MS,
  GUILD_SETTINGS_CUSTOM_ID,
} from "../constants/guildSettings.constants";
import type { GuildSettingsExportData } from "../guildSettingsDefaults";

/** インポート確認待ちのセッション状態 */
interface ImportSession {
  data: GuildSettingsExportData;
  warnings: string[];
  plan: ImportMergePlan;
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
  const service = getBotGuildSettingsService();
  const attachment = interaction.options.getAttachment("file", true);

  // JSONファイルをフェッチしてパース
  let parsed: unknown;
  try {
    const response = await fetch(attachment.url);
    const text = await response.text();
    parsed = JSON.parse(text);
  } catch {
    const embed = createErrorEmbed(
      tInteraction(locale, "guildSettings:user-response.import_invalid_json"),
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

  const importData = parsed as GuildSettingsExportData;

  // チャンネル/ロールIDの存在チェック（警告のみ）
  const warnings: string[] = [];
  if (interaction.guild) {
    const missingIds = checkMissingResources(importData, interaction.guild);
    if (missingIds.length > 0) {
      warnings.push(
        tInteraction(
          locale,
          "guildSettings:user-response.import_missing_channels",
        ),
      );
    }
  }

  // マージ計画を事前計算（確認ダイアログの「新規追加予定件数」表示用）
  const plan = await service.planImport(guildId, importData);

  // セッションに保存
  const sessionKey = `${guildId}:${interaction.user.id}`;
  importSessions.set(sessionKey, { data: importData, warnings, plan });

  // 確認ダイアログを表示
  const description =
    warnings.length > 0
      ? `${tInteraction(locale, "guildSettings:embed.description.import_confirm")}\n\n${warnings.join("\n")}`
      : tInteraction(locale, "guildSettings:embed.description.import_confirm");

  const confirmEmbed = createWarningEmbed(description, {
    title: tInteraction(locale, "guildSettings:embed.title.import_confirm"),
  }).addFields(buildSummaryFields(importData, plan, locale));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(GUILD_SETTINGS_CUSTOM_ID.IMPORT_CONFIRM)
      .setEmoji("✅")
      .setLabel(tInteraction(locale, "guildSettings:ui.button.import_confirm"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(GUILD_SETTINGS_CUSTOM_ID.IMPORT_CANCEL)
      .setEmoji("❌")
      .setLabel(tInteraction(locale, "guildSettings:ui.button.import_cancel"))
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

    if (i.customId === GUILD_SETTINGS_CUSTOM_ID.IMPORT_CONFIRM && session) {
      // インポート実行
      await service.importSettings(guildId, session.data);

      // キャッシュを即時無効化
      localeManager.invalidateLocaleCache(guildId);

      const successEmbed = createSuccessEmbed(
        tInteraction(locale, "guildSettings:user-response.import_success"),
      );
      await i.update({ embeds: [successEmbed], components: [] });

      logger.info(
        logPrefixed(
          "system:log_prefix.guild_config",
          "guildSettings:log.imported",
          { guildId },
        ),
      );
    } else if (i.customId === GUILD_SETTINGS_CUSTOM_ID.IMPORT_CANCEL) {
      const cancelEmbed = createSuccessEmbed(
        tInteraction(locale, "guildSettings:user-response.import_cancelled"),
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
        tInteraction(locale, "guildSettings:user-response.import_cancelled"),
      );
      await interaction
        .editReply({ embeds: [cancelEmbed], components: [] })
        .catch(() => {});
    }
  });
  /* istanbul ignore stop */
}

/**
 * 確認ダイアログに表示する「設定系」と「stateful（新規追加予定）」のフィールドを生成する。
 */
function buildSummaryFields(
  data: GuildSettingsExportData,
  plan: ImportMergePlan,
  locale: string,
): EmbedField[] {
  return [
    {
      name: tInteraction(
        locale,
        "guildSettings:embed.field.name.import_config",
      ),
      value: buildSettingsSummary(data),
      inline: false,
    },
    {
      name: tInteraction(locale, "guildSettings:embed.field.name.import_state"),
      value: tInteraction(
        locale,
        "guildSettings:embed.field.value.import_state_summary",
        {
          ticketSettings: plan.ticketSettingsToInsert,
          openTickets: plan.openTicketsToInsert,
          stickyMessages: plan.stickyMessagesToInsert,
          reactionRolePanels: plan.reactionRolePanelsToInsert,
          vacCreatedChannels: plan.vacCreatedChannelsToInsert,
        },
      ),
      inline: false,
    },
  ];
}

/** 設定系の有無サマリーを返す（言語 / エラー通知 / 各機能の有無を簡潔に列挙） */
function buildSettingsSummary(data: GuildSettingsExportData): string {
  const c = data.settings;
  const items: string[] = [];
  items.push(`locale: ${c.locale}`);
  items.push(`errorChannel: ${c.errorChannelId ? "○" : "—"}`);
  items.push(`afk: ${c.afk ? "○" : "—"}`);
  items.push(`bumpReminder: ${c.bumpReminder ? "○" : "—"}`);
  items.push(`vac: ${c.vac ? "○" : "—"}`);
  items.push(`memberLog: ${c.memberLog ? "○" : "—"}`);
  items.push(`vcRecruit: ${c.vcRecruit ? "○" : "—"}`);
  items.push(`vcAutoRecruit: ${c.vcAutoRecruit ? "○" : "—"}`);
  items.push(`inactiveKick: ${c.inactiveKick ? "○" : "—"}`);
  items.push(`unverifiedKick: ${c.unverifiedKick ? "○" : "—"}`);
  return items.join(" / ");
}

/**
 * インポートデータ内のチャンネル/ロールIDがサーバーに存在するか確認する
 * @param data インポートデータ
 * @param guild 対象ギルド
 * @returns 存在しないIDの配列
 */
function checkMissingResources(
  data: GuildSettingsExportData,
  guild: {
    channels: { cache: { has: (id: string) => boolean } };
    roles: { cache: { has: (id: string) => boolean } };
  },
): string[] {
  const missing: string[] = [];
  const c = data.settings;

  // 設定系のチャンネル/ロール
  if (c.errorChannelId && !guild.channels.cache.has(c.errorChannelId)) {
    missing.push(c.errorChannelId);
  }
  if (c.afk?.channelId && !guild.channels.cache.has(c.afk.channelId)) {
    missing.push(c.afk.channelId);
  }
  if (
    c.memberLog?.channelId &&
    !guild.channels.cache.has(c.memberLog.channelId)
  ) {
    missing.push(c.memberLog.channelId);
  }
  if (
    c.bumpReminder?.mentionRoleId &&
    !guild.roles.cache.has(c.bumpReminder.mentionRoleId)
  ) {
    missing.push(c.bumpReminder.mentionRoleId);
  }
  if (
    c.vcAutoRecruit?.channelId &&
    !guild.channels.cache.has(c.vcAutoRecruit.channelId)
  ) {
    missing.push(c.vcAutoRecruit.channelId);
  }
  if (c.inactiveKick) {
    if (
      c.inactiveKick.channelId &&
      !guild.channels.cache.has(c.inactiveKick.channelId)
    ) {
      missing.push(c.inactiveKick.channelId);
    }
    if (
      c.inactiveKick.markerRoleId &&
      !guild.roles.cache.has(c.inactiveKick.markerRoleId)
    ) {
      missing.push(c.inactiveKick.markerRoleId);
    }
    for (const roleId of c.inactiveKick.whitelistRoleIds) {
      if (!guild.roles.cache.has(roleId)) missing.push(roleId);
    }
  }
  if (c.unverifiedKick) {
    if (
      c.unverifiedKick.verifiedRoleId &&
      !guild.roles.cache.has(c.unverifiedKick.verifiedRoleId)
    ) {
      missing.push(c.unverifiedKick.verifiedRoleId);
    }
    if (
      c.unverifiedKick.markerRoleId &&
      !guild.roles.cache.has(c.unverifiedKick.markerRoleId)
    ) {
      missing.push(c.unverifiedKick.markerRoleId);
    }
    if (
      c.unverifiedKick.notifyChannelId &&
      !guild.channels.cache.has(c.unverifiedKick.notifyChannelId)
    ) {
      missing.push(c.unverifiedKick.notifyChannelId);
    }
    if (
      c.unverifiedKick.logChannelId &&
      !guild.channels.cache.has(c.unverifiedKick.logChannelId)
    ) {
      missing.push(c.unverifiedKick.logChannelId);
    }
    for (const roleId of c.unverifiedKick.exemptRoleIds) {
      if (!guild.roles.cache.has(roleId)) missing.push(roleId);
    }
  }

  // stateful データのチャンネル/ロール
  const state = data.state;
  if (state) {
    for (const cfg of state.ticketSettings) {
      if (!guild.channels.cache.has(cfg.panelChannelId)) {
        missing.push(cfg.panelChannelId);
      }
      for (const roleId of cfg.staffRoleIds) {
        if (!guild.roles.cache.has(roleId)) missing.push(roleId);
      }
    }
    for (const ticket of state.openTickets) {
      if (!guild.channels.cache.has(ticket.channelId)) {
        missing.push(ticket.channelId);
      }
    }
    for (const sticky of state.stickyMessages) {
      if (!guild.channels.cache.has(sticky.channelId)) {
        missing.push(sticky.channelId);
      }
    }
    for (const panel of state.reactionRolePanels) {
      if (!guild.channels.cache.has(panel.channelId)) {
        missing.push(panel.channelId);
      }
      for (const btn of panel.buttons) {
        for (const roleId of btn.roleIds) {
          if (!guild.roles.cache.has(roleId)) missing.push(roleId);
        }
      }
    }
    for (const vc of state.vacCreatedChannels) {
      if (!guild.channels.cache.has(vc.voiceChannelId)) {
        missing.push(vc.voiceChannelId);
      }
    }
  }

  return missing;
}
