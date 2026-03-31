// src/bot/features/ticket/handlers/ui/ticketRoleSelectHandler.ts
// スタッフロール設定（set/add/remove）ロール選択ハンドラ

import { MessageFlags, type RoleSelectMenuInteraction } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { RoleSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotTicketConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  parseStaffRoleIds,
  TICKET_CUSTOM_ID,
} from "../../commands/ticketCommand.constants";

/**
 * スタッフロール設定のロール選択メニューを処理するハンドラ
 */
export const ticketRoleSelectHandler: RoleSelectHandler = {
  /**
   * カスタムIDがロール設定プレフィックス（set/add/remove）に一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return (
      customId.startsWith(TICKET_CUSTOM_ID.SET_ROLES_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.ADD_ROLES_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.REMOVE_ROLES_PREFIX)
    );
  },

  /**
   * ロール設定メニューの操作を処理する
   * @param interaction ロール選択メニューインタラクション
   */
  async execute(interaction: RoleSelectMenuInteraction) {
    if (interaction.customId.startsWith(TICKET_CUSTOM_ID.SET_ROLES_PREFIX)) {
      await handleSetRoles(interaction);
    } else if (
      interaction.customId.startsWith(TICKET_CUSTOM_ID.ADD_ROLES_PREFIX)
    ) {
      await handleAddRoles(interaction);
    } else {
      await handleRemoveRoles(interaction);
    }
  },
};

/**
 * ロール設定（上書き）処理
 * @param interaction ロール選択メニューインタラクション
 */
async function handleSetRoles(
  interaction: RoleSelectMenuInteraction,
): Promise<void> {
  const categoryId = interaction.customId.slice(
    TICKET_CUSTOM_ID.SET_ROLES_PREFIX.length,
  );
  const configService = getBotTicketConfigService();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const config = await configService.findByGuildAndCategory(
    guildId,
    categoryId,
  );
  if (!config) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.config_not_found"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 選択されたロールで上書き更新
  const roleIds = Array.from(interaction.roles.keys());
  await configService.update(guildId, categoryId, {
    staffRoleIds: JSON.stringify(roleIds),
  });

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.set_roles_success"),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * ロール追加処理
 * @param interaction ロール選択メニューインタラクション
 */
async function handleAddRoles(
  interaction: RoleSelectMenuInteraction,
): Promise<void> {
  const categoryId = interaction.customId.slice(
    TICKET_CUSTOM_ID.ADD_ROLES_PREFIX.length,
  );
  const configService = getBotTicketConfigService();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const config = await configService.findByGuildAndCategory(
    guildId,
    categoryId,
  );
  if (!config) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.config_not_found"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 既存ロールと新規ロールをマージして重複を除去
  const existingRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);
  const newRoleIds = Array.from(interaction.roles.keys());
  const mergedRoleIds = [...new Set([...existingRoleIds, ...newRoleIds])];

  await configService.update(guildId, categoryId, {
    staffRoleIds: JSON.stringify(mergedRoleIds),
  });

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.add_roles_success"),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * ロール削除処理
 * @param interaction ロール選択メニューインタラクション
 */
async function handleRemoveRoles(
  interaction: RoleSelectMenuInteraction,
): Promise<void> {
  const categoryId = interaction.customId.slice(
    TICKET_CUSTOM_ID.REMOVE_ROLES_PREFIX.length,
  );
  const configService = getBotTicketConfigService();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const config = await configService.findByGuildAndCategory(
    guildId,
    categoryId,
  );
  if (!config) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.config_not_found"),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 既存ロールから選択されたロールを除外
  const existingRoleIds: string[] = parseStaffRoleIds(config.staffRoleIds);
  const removeRoleIds = Array.from(interaction.roles.keys());
  const remainingRoleIds = existingRoleIds.filter(
    (id) => !removeRoleIds.includes(id),
  );

  // 全ロールが削除される場合はエラー（最低1つ必要）
  if (remainingRoleIds.length === 0) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "ticket:user-response.cannot_remove_last_role",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await configService.update(guildId, categoryId, {
    staffRoleIds: JSON.stringify(remainingRoleIds),
  });

  const embed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "ticket:user-response.remove_roles_success",
    ),
    { locale: interaction.locale },
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
