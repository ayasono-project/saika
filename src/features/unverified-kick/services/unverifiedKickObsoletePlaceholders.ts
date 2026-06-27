// src/features/unverified-kick/services/unverifiedKickObsoletePlaceholders.ts
// unverified-kick カスタムテンプレートの廃止プレースホルダー検出・案内 Embed 構築

import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../../../shared/constants/embedColors";
import type { GuildTFunction } from "../../../shared/locale/helpers";

export interface ObsoleteUnverifiedKickPlaceholders {
  hasMarkerRole: boolean;
}

/** unverified-kick テンプレート設定に廃止プレースホルダーが含まれているか検出する */
export function detectObsoleteUnverifiedKickPlaceholders(settings: {
  notifyTemplate?: string | null;
  dmTemplate?: string | null;
}): ObsoleteUnverifiedKickPlaceholders {
  const templates = [settings.notifyTemplate, settings.dmTemplate];
  return {
    hasMarkerRole: templates.some((t) => t?.includes("{markerRole}") ?? false),
  };
}

/** 廃止プレースホルダー案内 Embed を構築する。検出がなければ null を返す */
export function buildObsoleteUnverifiedKickNotice(
  t: GuildTFunction,
  detected: ObsoleteUnverifiedKickPlaceholders,
): EmbedBuilder | null {
  if (!detected.hasMarkerRole) return null;

  return new EmbedBuilder()
    .setColor(EMBED_COLORS.UNVERIFIED_KICK_WARN)
    .setTitle(t("unverifiedKick:embed.title.obsolete_notice"))
    .setDescription(t("unverifiedKick:embed.description.obsolete_notice"))
    .addFields({
      name: t("unverifiedKick:embed.field.name.obsolete_marker_role"),
      value: t("unverifiedKick:embed.field.value.obsolete_marker_role"),
    });
}
