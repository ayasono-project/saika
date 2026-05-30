// src/features/inactive-kick/commands/inactiveKickSettingsCommand.whitelist.ts
// inactive-kick-settings の whitelist サブコマンドグループ（add / remove / list）

import { ValidationError } from "@ayasono/shared/core";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import { tInteraction } from "../../../shared/locale/localeManager";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/** Discord のセレクトメニュー最大選択肢数 */
const SELECT_MENU_MAX_OPTIONS = 25;

/** ephemeral 応答（成功）を返す */
async function replyResult(
  interaction: ChatInputCommandInteraction,
  descriptionKey: AllParseKeys,
  params?: Record<string, unknown>,
): Promise<void> {
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, descriptionKey, params),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * 除外リストにロール／ユーザーを追加する（いずれか必須・冪等）。
 */
export async function handleInactiveKickWhitelistAdd(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const role = interaction.options.getRole(
    INACTIVE_KICK_SETTINGS_COMMAND.OPTION.ROLE,
  );
  const user = interaction.options.getUser(
    INACTIVE_KICK_SETTINGS_COMMAND.OPTION.USER,
  );
  if (!role && !user) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.whitelist_requires_target",
      ),
    );
  }

  const service = getBotInactiveKickSettingsService();
  if (role) {
    const added = await service.addWhitelistRole(guildId, role.id);
    await replyResult(
      interaction,
      added
        ? "inactiveKick:user-response.whitelist_add_role_success"
        : "inactiveKick:user-response.whitelist_add_already",
      { role: `<@&${role.id}>` },
    );
    return;
  }
  if (user) {
    const added = await service.addWhitelistUser(guildId, user.id);
    await replyResult(
      interaction,
      added
        ? "inactiveKick:user-response.whitelist_add_user_success"
        : "inactiveKick:user-response.whitelist_add_already",
      { user: `<@${user.id}>` },
    );
  }
}

/**
 * 除外リストから削除する項目を選ぶセレクトメニューを表示する。
 * 登録済みのロール／ユーザーを複数選択でき、選択時に一括削除する（選択応答は select ハンドラ）。
 */
export async function handleInactiveKickWhitelistRemove(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
  const guild = interaction.guild;

  // 登録済みロール／ユーザーを 1 つのセレクト選択肢に集約する
  const options = [
    ...settings.whitelistRoleIds.map((id) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(guild?.roles.cache.get(id)?.name ?? `Role ${id}`)
        .setDescription(
          tInteraction(
            interaction.locale,
            "inactiveKick:embed.field.name.whitelist_roles",
          ),
        )
        .setValue(`role:${id}`),
    ),
    ...settings.whitelistUserIds.map((id) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(guild?.members.cache.get(id)?.displayName ?? `User ${id}`)
        .setDescription(
          tInteraction(
            interaction.locale,
            "inactiveKick:embed.field.name.whitelist_users",
          ),
        )
        .setValue(`user:${id}`),
    ),
  ].slice(0, SELECT_MENU_MAX_OPTIONS);

  // 除外リストが空なら案内のみ
  if (options.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.whitelist_empty",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "inactiveKick:embed.title.whitelist",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(INACTIVE_KICK_SETTINGS_COMMAND.WHITELIST_REMOVE_SELECT_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "inactiveKick:ui.select.whitelist_remove_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  await interaction.reply({
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 現在の除外リストを表示する。
 */
export async function handleInactiveKickWhitelistList(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
  const none = tInteraction(interaction.locale, "common:none");

  const embed = createInfoEmbed("", {
    title: tInteraction(
      interaction.locale,
      "inactiveKick:embed.title.whitelist",
    ),
    fields: [
      {
        name: tInteraction(
          interaction.locale,
          "inactiveKick:embed.field.name.whitelist_roles",
        ),
        value:
          settings.whitelistRoleIds.length > 0
            ? settings.whitelistRoleIds.map((id) => `<@&${id}>`).join(" ")
            : none,
      },
      {
        name: tInteraction(
          interaction.locale,
          "inactiveKick:embed.field.name.whitelist_users",
        ),
        value:
          settings.whitelistUserIds.length > 0
            ? settings.whitelistUserIds.map((id) => `<@${id}>`).join(" ")
            : none,
      },
    ],
  });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
