// src/bot/shared/permissionGuards.ts
// コマンド共通権限ガード

import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { PermissionError } from "../../shared/errors/customErrors";
import { tInteraction } from "../../shared/locale/localeManager";
import { COMMON_I18N_KEYS } from "./i18nKeys";

/**
 * ManageGuild 権限を検証する共通ガード
 * @param interaction 権限を検証するコマンド実行インタラクション
 * @returns 検証完了を示す Promise（権限不足時は PermissionError を送出）
 */
export function ensureManageGuildPermission(
  interaction: ChatInputCommandInteraction,
): void {
  // Discord UI 側の権限制御だけに依存せず、実行時にも明示的に確認する
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new PermissionError(
      tInteraction(interaction.locale, COMMON_I18N_KEYS.MANAGE_GUILD_REQUIRED),
    );
  }
}
