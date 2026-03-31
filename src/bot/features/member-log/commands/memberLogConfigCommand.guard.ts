// src/bot/features/member-log/commands/memberLogConfigCommand.guard.ts
// member-log-config コマンド共通ガード

import { type ChatInputCommandInteraction } from "discord.js";
import { ensureManageGuildPermission } from "../../../../bot/shared/permissionGuards";

/**
 * ManageGuild 権限を検証する共通ガード
 * @param interaction 権限を検証するコマンド実行インタラクション
 * @returns 検証完了を示す Promise（権限不足時は PermissionError を送出）
 */
export async function ensureMemberLogManageGuildPermission(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await ensureManageGuildPermission(interaction);
}
