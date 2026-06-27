// src/features/inactive-kick/services/inactiveKickObsoletePlaceholders.ts
// inactive-kick カスタムテンプレートの廃止プレースホルダー検出・案内 Embed 構築

import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";

export interface ObsoleteInactiveKickPlaceholders {
  hasDaysLeft: boolean;
  hasMarkerRole: boolean;
}

/** inactive-kick テンプレート設定に廃止プレースホルダーが含まれているか検出する */
export function detectObsoleteInactiveKickPlaceholders(settings: {
  weekWarnMessage?: string | null;
  finalWarnMessage?: string | null;
  kickMessage?: string | null;
}): ObsoleteInactiveKickPlaceholders {
  const templates = [
    settings.weekWarnMessage,
    settings.finalWarnMessage,
    settings.kickMessage,
  ];
  return {
    hasDaysLeft: templates.some((t) => t?.includes("{daysLeft}") ?? false),
    hasMarkerRole: templates.some((t) => t?.includes("{markerRole}") ?? false),
  };
}

/** 廃止プレースホルダー案内 Embed を構築する。検出がなければ null を返す */
export function buildObsoleteInactiveKickNotice(
  t: GuildTFunction,
  detected: ObsoleteInactiveKickPlaceholders,
): EmbedBuilder | null {
  if (!detected.hasDaysLeft && !detected.hasMarkerRole) return null;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.INACTIVE_KICK_WARN)
    .setTitle(t("inactiveKick:embed.title.obsolete_notice"))
    .setDescription(t("inactiveKick:embed.description.obsolete_notice"));

  if (detected.hasMarkerRole) {
    embed.addFields({
      name: t("inactiveKick:embed.field.name.obsolete_marker_role"),
      value: t("inactiveKick:embed.field.value.obsolete_marker_role"),
    });
  }
  if (detected.hasDaysLeft) {
    embed.addFields({
      name: t("inactiveKick:embed.field.name.obsolete_days_left"),
      value: t("inactiveKick:embed.field.value.obsolete_days_left"),
    });
  }

  return embed;
}
