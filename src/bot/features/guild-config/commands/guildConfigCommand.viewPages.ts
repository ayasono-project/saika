// src/bot/features/guild-config/commands/guildConfigCommand.viewPages.ts
// guild-config view の各ページ Embed 生成（純粋関数）

import type { EmbedBuilder } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  getBotBumpReminderConfigService,
  getBotGuildConfigService,
  getBotMemberLogConfigService,
  getBotStickyMessageConfigService,
  getBotVacConfigService,
  getBotVcRecruitConfigService,
} from "../../../services/botCompositionRoot";
import { createInfoEmbed } from "../../../utils/messageResponse";
import { PAGE_VALUES, VIEW_PAGES } from "../constants/guildConfig.constants";

/**
 * 指定ページの Embed を生成する
 * 各ページの内容はリクエストごとに再生成する（メモリ保持不要）
 * @param pageIndex 表示するページ番号（0-indexed）
 * @param guildId 表示対象のギルドID
 * @param locale interaction.locale
 * @returns ページの Embed
 */
export async function buildPage(
  pageIndex: number,
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const page = VIEW_PAGES[pageIndex];
  if (!page) {
    return createInfoEmbed("", {
      title: tInteraction(locale, "guildConfig:embed.title.view"),
    });
  }

  switch (page.value) {
    case PAGE_VALUES.GUILD_CONFIG:
      return buildGuildConfigPage(guildId, locale);
    case PAGE_VALUES.AFK:
      return buildAfkPage(guildId, locale);
    case PAGE_VALUES.VAC:
      return buildVacPage(guildId, locale);
    case PAGE_VALUES.VC_RECRUIT:
      return buildVcRecruitPage(guildId, locale);
    case PAGE_VALUES.STICKY:
      return buildStickyPage(guildId, locale);
    case PAGE_VALUES.MEMBER_LOG:
      return buildMemberLogPage(guildId, locale);
    case PAGE_VALUES.BUMP:
      return buildBumpPage(guildId, locale);
    default:
      return createInfoEmbed("");
  }
}

/**
 * ページ1: ギルド設定（locale + errorChannelId）
 */
async function buildGuildConfigPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config = await getBotGuildConfigService().getConfig(guildId);
  const notConfigured = tInteraction(
    locale,
    "common:embed.field.value.not_configured",
  );

  const localeLabel = config?.locale === "en" ? "English (en)" : "日本語 (ja)";
  const errorChannelValue = config?.errorChannelId
    ? `<#${config.errorChannelId}>`
    : notConfigured;

  return createInfoEmbed("", {
    title: tInteraction(locale, "guildConfig:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "guildConfig:embed.field.name.locale"),
        value: localeLabel,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "guildConfig:embed.field.name.error_channel",
        ),
        value: errorChannelValue,
        inline: true,
      },
    ],
  });
}

/**
 * ページ2: AFK設定
 */
async function buildAfkPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const repo = await import("../../../../shared/features/afk/afkConfigService");
  const afkConfig = await repo.getAfkConfig(guildId);
  const isConfigured = afkConfig?.enabled && afkConfig?.channelId;
  const statusValue = tInteraction(
    locale,
    isConfigured ? "common:enabled" : "common:disabled",
  );
  const channelValue = afkConfig?.channelId
    ? `<#${afkConfig.channelId}>`
    : tInteraction(locale, "common:embed.field.value.not_configured");

  return createInfoEmbed("", {
    title: tInteraction(locale, "afk:embed.title.config_view"),
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: statusValue,
        inline: true,
      },
      {
        name: tInteraction(locale, "afk:embed.field.name.channel"),
        value: channelValue,
        inline: true,
      },
    ],
  });
}

/**
 * ページ3: VAC設定
 */
async function buildVacPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config = await getBotVacConfigService().getVacConfigOrDefault(guildId);
  const triggerValue =
    config.triggerChannelIds.length > 0
      ? config.triggerChannelIds.map((id) => `<#${id}>`).join(", ")
      : tInteraction(locale, "common:none");

  return createInfoEmbed("", {
    title: tInteraction(locale, "vac:embed.title.config_view"),
    fields: [
      {
        name: tInteraction(locale, "vac:embed.field.name.trigger_channels"),
        value: triggerValue,
        inline: false,
      },
    ],
  });
}

/**
 * ページ4: VC募集設定
 */
async function buildVcRecruitPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config =
    await getBotVcRecruitConfigService().getVcRecruitConfigOrDefault(guildId);

  const setupsValue =
    config.setups.length > 0
      ? config.setups
          .map((s) => `<#${s.panelChannelId}> → <#${s.postChannelId}>`)
          .join("\n")
      : tInteraction(locale, "common:none");

  return createInfoEmbed("", {
    title: tInteraction(locale, "vcRecruit:embed.title.config_view"),
    fields: [
      {
        name: tInteraction(locale, "vcRecruit:embed.field.name.setups"),
        value: setupsValue,
        inline: false,
      },
    ],
  });
}

/**
 * ページ5: メッセージ固定設定
 */
async function buildStickyPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const service = getBotStickyMessageConfigService();
  const stickies = await service.findAllByGuild(guildId);

  const value =
    stickies.length > 0
      ? stickies.map((s) => `<#${s.channelId}>`).join(", ")
      : tInteraction(locale, "common:none");

  return createInfoEmbed("", {
    title: tInteraction(locale, "stickyMessage:embed.title.view"),
    fields: [
      {
        name: tInteraction(locale, "stickyMessage:embed.field.name.channel"),
        value,
        inline: false,
      },
    ],
  });
}

/**
 * ページ6: メンバーログ設定
 */
async function buildMemberLogPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config =
    await getBotMemberLogConfigService().getMemberLogConfig(guildId);
  const labelNone = tInteraction(locale, "common:none");

  if (!config) {
    return createInfoEmbed(
      tInteraction(locale, "memberLog:embed.description.not_configured"),
      {
        title: tInteraction(locale, "memberLog:embed.title.config_view"),
      },
    );
  }

  return createInfoEmbed("", {
    title: tInteraction(locale, "memberLog:embed.title.config_view"),
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: tInteraction(
          locale,
          config.enabled ? "common:enabled" : "common:disabled",
        ),
        inline: true,
      },
      {
        name: tInteraction(locale, "memberLog:embed.field.name.channel"),
        value: config.channelId ? `<#${config.channelId}>` : labelNone,
        inline: true,
      },
      {
        name: tInteraction(locale, "memberLog:embed.field.name.join_message"),
        value: config.joinMessage ?? labelNone,
        inline: false,
      },
      {
        name: tInteraction(locale, "memberLog:embed.field.name.leave_message"),
        value: config.leaveMessage ?? labelNone,
        inline: false,
      },
    ],
  });
}

/**
 * ページ7: Bumpリマインダー設定
 */
async function buildBumpPage(
  guildId: string,
  locale: string,
): Promise<EmbedBuilder> {
  const config =
    await getBotBumpReminderConfigService().getBumpReminderConfig(guildId);
  const labelNone = tInteraction(locale, "common:none");

  if (!config) {
    return createInfoEmbed(
      tInteraction(locale, "bumpReminder:embed.description.not_configured"),
      {
        title: tInteraction(locale, "bumpReminder:embed.title.config_view"),
      },
    );
  }

  return createInfoEmbed("", {
    title: tInteraction(locale, "bumpReminder:embed.title.config_view"),
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: tInteraction(
          locale,
          config.enabled ? "common:enabled" : "common:disabled",
        ),
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "bumpReminder:embed.field.name.mention_role",
        ),
        value: config.mentionRoleId ? `<@&${config.mentionRoleId}>` : labelNone,
        inline: true,
      },
      {
        name: tInteraction(
          locale,
          "bumpReminder:embed.field.name.mention_users",
        ),
        value:
          config.mentionUserIds.length > 0
            ? config.mentionUserIds.map((id: string) => `<@${id}>`).join(", ")
            : labelNone,
        inline: false,
      },
    ],
  });
}
