// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.preview.ts
// unverified-kick-settings preview 実行処理（現在のキック対象・事前警告対象を一覧表示）

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  getBotUnverifiedKickSettingsService,
  getBotUnverifiedKickWarnRepository,
} from "../../../bot/services/botCompositionRoot";
import { sendPaginatedEmbeds } from "../../../bot/shared/pagination";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import { tInteraction } from "../../../shared/locale/localeManager";
import { buildPreviewEmbedPages } from "../services/unverifiedKickNotifier";
import { buildCandidateBuckets } from "../services/unverifiedKickRunner";
import {
  UNVERIFIED_KICK_PREVIEW_MS,
  UNVERIFIED_KICK_SETTINGS_COMMAND,
} from "./unverifiedKickSettingsCommand.constants";

/**
 * 現在のキック対象・事前警告対象を一覧表示する（read-only・日次チェックと同一判定）。
 */
export async function handleUnverifiedKickPreview(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const guild = interaction.guild;
  if (!guild) return;

  // メンバー取得に時間がかかり得るため defer
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const settings =
    await getBotUnverifiedKickSettingsService().getSettingsOrDefault(guildId);
  const members = [...(await guild.members.fetch()).values()];
  // 警告済み判定のため warnedAt を読み込む（read-only・書き込みはしない）
  const warnedMap =
    await getBotUnverifiedKickWarnRepository().getWarnedMap(guildId);
  const buckets = buildCandidateBuckets(
    guild,
    members,
    settings,
    new Date(),
    warnedMap,
  );

  // interaction.locale に束ねた翻訳関数
  const t: GuildTFunction = (key, options) =>
    tInteraction(interaction.locale, key, options);

  const pages = buildPreviewEmbedPages(buckets, t);

  await sendPaginatedEmbeds({
    send: (payload) => interaction.editReply(payload),
    pages,
    prefix: UNVERIFIED_KICK_SETTINGS_COMMAND.PREVIEW_PAGINATOR_PREFIX,
    timeMs: UNVERIFIED_KICK_PREVIEW_MS,
    filterUserId: interaction.user.id,
    locale: interaction.locale,
  });
}
