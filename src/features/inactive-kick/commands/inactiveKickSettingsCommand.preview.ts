// src/features/inactive-kick/commands/inactiveKickSettingsCommand.preview.ts
// inactive-kick-settings preview 実行処理（現在のキック対象・通知対象を一覧表示）

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { sendPaginatedEmbeds } from "../../../bot/shared/pagination";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import { tInteraction } from "../../../shared/locale/localeManager";
import { buildPreviewEmbedPages } from "../services/inactiveKickNotifier";
import { buildCandidateBuckets } from "../services/inactiveKickRunner";
import {
  INACTIVE_KICK_PREVIEW_MS,
  INACTIVE_KICK_SETTINGS_COMMAND,
} from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/**
 * 現在のキック対象・段階通知対象を一覧表示する（read-only・日次チェックと同一判定）。
 */
export async function handleInactiveKickPreview(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const guild = interaction.guild;
  if (!guild) return;

  // メンバー取得に時間がかかり得るため defer
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
  const members = [...(await guild.members.fetch()).values()];
  const buckets = await buildCandidateBuckets(
    guild,
    members,
    settings,
    new Date(),
  );

  // interaction.locale に束ねた翻訳関数
  const t: GuildTFunction = (key, options) =>
    tInteraction(interaction.locale, key, options);

  const pages = buildPreviewEmbedPages(buckets, t);

  await sendPaginatedEmbeds({
    send: (payload) => interaction.editReply(payload),
    pages,
    prefix: INACTIVE_KICK_SETTINGS_COMMAND.PREVIEW_PAGINATOR_PREFIX,
    timeMs: INACTIVE_KICK_PREVIEW_MS,
    filterUserId: interaction.user.id,
    locale: interaction.locale,
  });
}
