// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.exempt.ts
// unverified-kick-settings の exempt サブコマンドグループ（add / remove / list）

import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../bot/utils/messageResponse";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import { tInteraction } from "../../../shared/locale/localeManager";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "./unverifiedKickSettingsCommand.constants";

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
 * 除外ロールを追加する（冪等）。
 */
export async function handleUnverifiedKickExemptAdd(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const role = interaction.options.getRole(
    UNVERIFIED_KICK_SETTINGS_COMMAND.OPTION.ROLE,
    true,
  );
  const added = await getBotUnverifiedKickSettingsService().addExemptRole(
    guildId,
    role.id,
  );
  await replyResult(
    interaction,
    added
      ? "unverifiedKick:user-response.exempt_add_success"
      : "unverifiedKick:user-response.exempt_add_already",
    { role: `<@&${role.id}>` },
  );
}

/**
 * 除外ロールから削除する項目を選ぶセレクトメニューを表示する（選択時に一括削除）。
 */
export async function handleUnverifiedKickExemptRemove(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const settings =
    await getBotUnverifiedKickSettingsService().getSettingsOrDefault(guildId);
  const guild = interaction.guild;

  const options = settings.exemptRoleIds
    .map((id) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(guild?.roles.cache.get(id)?.name ?? `Role ${id}`)
        .setValue(id),
    )
    .slice(0, SELECT_MENU_MAX_OPTIONS);

  // 除外リストが空なら案内のみ
  if (options.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            interaction.locale,
            "unverifiedKick:user-response.exempt_empty",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "unverifiedKick:embed.title.exempt",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(UNVERIFIED_KICK_SETTINGS_COMMAND.EXEMPT_REMOVE_SELECT_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "unverifiedKick:ui.select.exempt_remove_placeholder",
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
 * 現在の除外ロールを表示する。
 */
export async function handleUnverifiedKickExemptList(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureManageGuildPermission(interaction);

  const settings =
    await getBotUnverifiedKickSettingsService().getSettingsOrDefault(guildId);
  const none = tInteraction(interaction.locale, "common:none");

  const embed = createInfoEmbed("", {
    title: tInteraction(
      interaction.locale,
      "unverifiedKick:embed.title.exempt",
    ),
    fields: [
      {
        name: tInteraction(
          interaction.locale,
          "unverifiedKick:embed.field.name.exempt_roles",
        ),
        value:
          settings.exemptRoleIds.length > 0
            ? settings.exemptRoleIds.map((id) => `<@&${id}>`).join(" ")
            : none,
      },
    ],
  });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
